/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "mmaps.h"
#include "ui_mmaps.h"

unsigned int MMaps::_count(0);

MMaps::MMaps(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MMaps),
    popup(),popupLoc(),
    _areas(),
    _all_items(),
    _last_area(0)
{
    ui->setupUi(this);

    setWindowTitle(tr("Maps (")+QString::number(++_count)+")");

    ui->dwMapLoc->hide();
    ui->wdgCheckMaps->setEnabled(false);

    ui->iwImg->drawarea()->setSizePolicy(QSizePolicy::Expanding,
                           QSizePolicy::Expanding);
    ui->iwImg->drawarea()->setImageMode(CMImage::Map);

    ui->iwWorld->drawarea()->setSizePolicy(QSizePolicy::Expanding,
                           QSizePolicy::Expanding);
    ui->iwWorld->drawarea()->setImageMode(CMImage::Map);
    ui->iwWorld->setMode(MImageWidget::Map);

    ui->wdgWZoomPanel->setEnabled(ui->iwWorld->drawarea()->loadPage(QDir::toNativeSeparators("icons/maps/world.png"),computeWValue()));

    connect(ui->iwImg->drawarea(),SIGNAL(resizeRequested(bool)),this,SLOT(slot_iwImg_resizeRequested(bool)));
    connect(ui->iwWorld->drawarea(),SIGNAL(resizeRequested(bool)),this,SLOT(slot_iwWorld_resizeRequested(bool)));

    connect(ui->iwWorld->drawarea(),SIGNAL(beforeSceneResized()),this,SLOT(slot_beforeSceneResized()));
    connect(ui->iwWorld->drawarea(),SIGNAL(afterSceneResized()),this,SLOT(slot_afterSceneResized()));
    connect(ui->iwWorld->drawarea(),SIGNAL(selectionChanged(QRectF)),this,SLOT(slot_iwWorld_selectionChanged(QRectF)));

    open_map=popup.addAction(tr("&view map"));
    popup.addSeparator();
    expand=popup.addAction(tr("&expand"));
    collapse=popup.addAction(tr("&collapse"));
    expand_all=popup.addAction(tr("e&xpand all"));
    collapse_all=popup.addAction(tr("c&ollapse all"));
    popup.addSeparator();
    del_map=popup.addAction(tr("&delete item(s)"));
    bkp_map=popup.addAction(tr("&backup collection"));
    //import_col=popup.addAction(tr("import collection"));
    popup.addSeparator();
    reload_maps=popup.addAction(QIcon(":/new/icons/icons/refresh.png"),tr("&reload tree"));
    popup.addSeparator();
    create_col=popup.addAction(tr("create co&llection"));
    add_map=popup.addAction(tr("&add map"));
    edit_cm=popup.addAction(tr("edi&t item"));
    imp_img=popup.addAction(tr("i&mport image"));
    reorder_maps=popup.addAction(tr("reorder map&s"));
    //map_longlat=popup.addAction(tr("set map area"));

    bool const b=m_sett()->isCopticEditable();

    create_col->setVisible(b);
    add_map->setVisible(b);
    edit_cm->setVisible(b);
    imp_img->setVisible(b);
    reorder_maps->setVisible(b);

    a_openloc=popupLoc.addAction(tr("&view map"));

    loadData();

    IC_SIZES
}

MMaps::~MMaps()
{
    RM_WND;
    delete ui;
}

bool MMaps::loadData()
{
    MMapTreeItem * last_i=(MMapTreeItem *)ui->treeImages->currentItem();
        int last_id=-1;
        if(last_i&&last_i->_is_image)
            last_id=last_i->_id;

        _all_items.clear();
        ui->treeImages->clear();
        QString query("select `image_collection`.`id`,`image_collection`.`name`,`image_collection`.`dirname`,`image`.`id`,`image`.`name`,`image`.`filename`,`image`.`comment` from `image_collection` left outer join `image` on `image_collection`.`id`=`image`.`collection` order by `image_collection`.`name`,`image`.`ord`");
        CMySql q(query);
        m_msg()->MsgMsg(tr("executing query '")+query+"' ...");
        if(!q.exec())
        {
            m_msg()->MsgErr(q.lastError());
            return false;
        }

        unsigned int lastid(0),maps_count(0);
        MMapTreeItem * i(0),*new_last_i(0);
        while(q.next())
        {
            unsigned int currid(q.value(0).toUInt());
            if(lastid!=currid)
            {
                if(i)
                    ui->treeImages->addTopLevelItem(i);
                i=new MMapTreeItem();
                QString n(q.value(1));
                i->setText(0,n);
                i->setToolTip(0,n);
                i->_map=n;
                i->_filename=q.value(2);
                i->_is_image=false;
                i->_id=q.value(0).toInt();

                lastid=currid;
            }

            MMapTreeItem * chi=new MMapTreeItem();
            if(!q.isNULL(3))
            {
                QString n(q.value(4));
                chi->_map=n;
                chi->setText(0,n);
                chi->setToolTip(0,n);
                chi->_filename=q.value(5);
                chi->_is_image=true;
                chi->_parentItem=i;
                chi->_id=q.value(3).toInt();

                if(!q.isNULL(6))
                {
                    QStringList longlat(q.value(6).split(QString(";")));
                    for(int x=0;x<longlat.count();x++)
                    {
                        if(x<=3)
                            chi->_coord.append(longlat.at(x).toDouble());
                        else
                        {
                            if(x==4)
                                chi->_from_age=longlat.at(x).toShort();
                            else if(x==5)
                                chi->_to_age=longlat.at(x).toShort();
                        }
                    }
                }
                _all_items.append(chi);
                i->addChild(chi);
                maps_count++;
                if(chi->_id==last_id)
                    new_last_i=chi;
            }
        }
        if(i)
            ui->treeImages->addTopLevelItem(i);
        ui->treeImages->headerItem()->setText(0,tr("map (")+QString::number(maps_count)+")");
        m_msg()->MsgOk();

        if(new_last_i)
            ui->treeImages->setCurrentItem(new_last_i);

        return true;
}

void MMaps::on_treeImages_itemDoubleClicked(QTreeWidgetItem* item, int )
{
    MMapTreeItem * mi((MMapTreeItem*)item);
    if(mi)
        if(mi->_is_image)
        {
            USE_CLEAN_WAIT

            QString ct(((MMapTreeItem*)mi->_parentItem)->_map),
                    bt(mi->_map),
                    cf(((MMapTreeItem*)mi->_parentItem)->_filename),
                    bf(mi->_filename),
                    imgid(QString::number(mi->_id));

            setWindowTitle(tr("Maps - ")+ct+", "+bt);
            QDir wdir;
            QString dname(QDir::toNativeSeparators("data/maps/"+cf));
            QString fname(dname+QDir::separator()+bf);

            m_msg()->MsgMsg(tr("loading '")+fname+"' ...");
            if(!wdir.exists(fname))
            {
                m_msg()->MsgMsg("'"+fname+tr("' don't exist, retrieving from database ..."));
                if(!QDir(dname).exists())
                {
                    m_msg()->MsgMsg(tr("directory '")+dname+tr("' don't exist, creating ..."));
                    if(!wdir.mkpath(dname))
                    {
                        m_msg()->MsgErr(tr("cannot create directory"));
                        return;
                    }
                }
                QString query("select `image`,length(`image`) from `image` where `id`="+imgid);
                CMySql q(query);

                m_msg()->MsgMsg(tr("executing query '")+query+"' ...");
                if(!q.exec())
                {
                    m_msg()->MsgErr(q.lastError());
                    return;
                }
                if(!q.first())
                {
                    m_msg()->MsgErr(tr("something wrong"));
                    return;
                }

                if(q.isNULL(0))
                {
                    m_msg()->MsgErr(tr("image is NULL, import it or delete"));
                    return;
                }

                m_msg()->MsgMsg(q.value(1)+tr(" bytes"));
                QFile f(fname);
                if(!f.open(QIODevice::WriteOnly))
                {
                    m_msg()->MsgErr(tr("cannot open file '")+fname+tr("' for writing"));
                    return;
                }

                char * pch =q.data(0);
                while(*pch)
                {
                    char byte[3]={0,0,0};
                    for(int x=0;x<2;x++)
                    {
                        byte[x]=*pch++;
                        if(!pch)
                        {
                            m_msg()->MsgErr(tr("file '")+fname+tr("' is corrupted"));
                            return;
                        }
                    }
                    bool ok;
                    QString bstr(&byte[0]);
                    unsigned char bw=bstr.toUShort(&ok,16);
                    if(!ok)
                    {
                        m_msg()->MsgErr(tr("file '")+fname+tr("' is corrupted"));
                            return;
                    }
                    else
                        f.write((const char*)&bw,1);
                }
                f.close();
            }
            bool b=ui->iwImg->drawarea()->loadPage(fname,computeValue());
            ui->wdgZoomPanel->setEnabled(b);
            if(b)
                ui->tabMaps->setCurrentIndex(0);
        }
}

void MMaps::on_btZ1_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZ2_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(200);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZ3_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(300);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZ4_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(400);
    //on_sldZoom_sliderReleased();
}

/*void MMaps::checkZoomB(QToolButton * b)
{
    btZ1->setChecked(false);
    btZ2->setChecked(false);
    btZ3->setChecked(false);
    btZ4->setChecked(false);
    btZD2->setChecked(false);
    btZD3->setChecked(false);
    btZD4->setChecked(false);
    btZD5->setChecked(false);
    b->setChecked(true);
}*/

void MMaps::on_btZD2_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/2);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZD5_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/5);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZD4_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/4);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_btZD3_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/3);
    //on_sldZoom_sliderReleased();
}

void MMaps::on_treeImages_customContextMenuRequested(QPoint )
{
    QAction * a;
    popup.setActiveAction(open_map);
    if((a=popup.exec()))
    {
        if(a==del_map)
            deleteMap();
        else if(a==bkp_map)
            backupMap();
        else if(a==reload_maps)
            loadData();
        else if(a==create_col)
            createCollection();
        else if(a==add_map)
            createMap();
        else if(a==edit_cm)
            editItem();
        else if(a==imp_img)
            importImage();
        else if(a==reorder_maps)
            reorderMaps();
        else if(a==open_map)
            on_treeImages_itemDoubleClicked(ui->treeImages->currentItem(),0);
        /*else if(a==import_col)
        {
            emit importRequested();
            loadData();
        }*/
        /*else if(a==map_longlat)
            setMapArea();*/
        else if(a==expand)
            ui->treeImages->expand(ui->treeImages->currentIndex());
        else if(a==collapse)
            ui->treeImages->collapse(ui->treeImages->currentIndex());
        else if(a==expand_all)
            ui->treeImages->expandAll();
        else if(a==collapse_all)
            ui->treeImages->collapseAll();
    }
}

void MMaps::deleteMap()
{
    QList<QTreeWidgetItem*> li=ui->treeImages->selectedItems();
    if(!li.isEmpty())
    {
        //QList<QTreeWidgetItem*> cols,maps;
        QString scols,smaps,qcols,qmaps;
        for(int x=0;x<li.count();x++)
        {
            MMapTreeItem * i((MMapTreeItem*)li.at(x));
            //QString s(li[x]->text(0));
            if(!i->parent())
            {
                //cols.append(li[x]);
                scols.append(i->_map+"\n");
                qcols.append(QString::number(i->_id)+",");
            }
            else
            {
                //maps.append(li[x]);
                smaps.append(i->_map+"\n");
                qmaps.append(QString::number(i->_id)+",");
            }
        }

        bool reload(false);
        if(!qcols.isEmpty())
        {
            qcols.chop(1);
            qcols.prepend("`image_collection`.`id` in(");
            qcols.append(")");

            QMessageBox mb(tr("delete map"),tr("Deleting collection(s)\n\n")+scols+tr("\nContinue?"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
            if(mb.exec()==QMessageBox::Yes)
            {
                QString query("delete from `image_collection`,`image` using `image_collection` left join `image` on `image_collection`.`id`=`image`.`collection` where "+qcols);
                MQUERY(q,query)
                m_msg()->MsgOk();
                reload=true;
            }
        }

        if(!qmaps.isEmpty())
        {
            qmaps.chop(1);
            qmaps.prepend("`id` in(");
            qmaps.append(")");

            QMessageBox mb(tr("delete map"),tr("Deleting map(s)\n\n")+smaps+tr("\nContinue?"),QMessageBox::Question,QMessageBox::Cancel,QMessageBox::Yes,QMessageBox::NoButton);
            if(mb.exec()==QMessageBox::Yes)
            {
                QString query("delete from `image` where "+qmaps);
                MQUERY(q,query)
                m_msg()->MsgOk();
                reload=true;
            }
        }

        if(reload)
            loadData();
    }
    else
        m_msg()->MsgWarn(tr("no item selected"));
}

void MMaps::backupMap()
{
    QList<QTreeWidgetItem*> li=ui->treeImages->selectedItems();
    if(!li.isEmpty())
    {
        MMapTreeItem * i=(MMapTreeItem*)li.first();
        if(!i->_is_image)
        {
            QFileDialog fd(0,tr("backup file"),QDir::toNativeSeparators("data/backup"),"msql files (*.msql);;all files (*)");
            fd.setFileMode(QFileDialog::AnyFile);
            fd.setAcceptMode(QFileDialog::AcceptSave);
            fd.setDefaultSuffix("msql");

            if(fd.exec())
            {
                QString fn(fd.selectedFiles().first());
                QString queryDetect("select `name` from `image` where `image` is null and `collection`="+QString::number(i->_id)+" order by `name`"),
                        query1("select `id`,quote(`name`),quote(`dirname`) from `image_collection` where `id`="+QString::number(i->_id)+" order by `id`"),
                query2("select `id`,`collection`,quote(`name`),quote(`filename`),`ord`,quote(`image`),quote(`comment`) from `image` where `collection`="+QString::number(i->_id)+" order by `ord`");

                MQUERY(qd,queryDetect)

                if(qd.size()>0)
                {
                    QString names;
                    while(qd.next())
                        names.append(qd.value(0)+"\n");
                    m_msg()->MsgErr(tr("Missing data of map(s):\n\n")+names+tr("\nImport all data first."));
                    return;
                }

                CProgressDialog pd;
                pd.show();

                m_msg()->MsgMsg(tr("creating file '")+fn+"' ...");
                QFile f(fn);
                if(!f.open(QIODevice::WriteOnly))
                {
                    m_msg()->MsgErr(tr("cannot open file '")+fn+"'");
                    return;
                }

                MQUERY(q1,query1)
                MQUERY(q2,query2)

                pd.initProgress(tr("backup ..."),q1.size()+q2.size());

                while(q1.next())
                {
                    QString line("insert into `image_collection` (`id`,`name`,`dirname`,`comment`) values (");
                    line.append(q1.value(0)+","+
                        q1.value(1)+","+
                        q1.value(2)+",null)"+CMySql::delimiter);
                    if(!f.write(line.toUtf8()))
                    {
                        m_msg()->MsgErr(tr("cannot write into file '")+fn+"'");
                        f.close();
                        return;
                    }
                    if(pd.stopped())
                    {
                        pd.close();
                        m_msg()->MsgInf(tr("interrupted"));
                        return;
                    }
                    pd.incProgress();
                }
                while(q2.next())
                {
                    if(q2.value(5)=="NULL")
                        m_msg()->MsgWarn(tr("map name: '")+q2.value(2)+tr("', image is NULL, import image and backup again"));
                    else
                    {
                        QString line("insert into `image` (`id`,`collection`,`name`,`filename`,`ord`,`image`,`comment`) values (");
                        line.append(q2.value(0)+","+
                            q2.value(1)+","+
                            q2.value(2)+","+
                            q2.value(3)+","+
                            q2.value(4)+","+
                            q2.value(5)+","+
                            q2.value(6)+")"+CMySql::delimiter);
                        if(!f.write(line.toUtf8()))
                        {
                            m_msg()->MsgErr(tr("cannot write into file '")+fn+"'");
                            f.close();
                            return;
                        }
                    }
                    if(pd.stopped())
                    {
                        pd.close();
                        m_msg()->MsgMsg(tr("interrupted"));
                        return;
                    }
                    pd.incProgress();
                }
                f.close();
                pd.close();
                m_msg()->MsgOk();
            }
        }
        else
            m_msg()->MsgWarn(tr("no collection selected"));
    }
    else
        m_msg()->MsgWarn(tr("no collection selected"));
}

void MMaps::on_sldZoom_valueChanged(int value)
{
    double v(((double)value)/100);
    ui->lblValue->setText("x"+QString::number(v,'f',2));
    if(!ui->sldZoom->isSliderDown())
        scaleArea();
}

void MMaps::on_sldZoom_sliderReleased()
{
    scaleArea();
}

void MMaps::on_sldWorldZoom_sliderReleased()
{
    scaleWArea();
}

void MMaps::on_sldWorldZoom_valueChanged(int value)
{
    double v(((double)value)/100);
    ui->lblWValue->setText("x"+QString::number(v,'f',2));
    if(!ui->sldWorldZoom->isSliderDown())
        scaleWArea();
}

void MMaps::scaleArea()
{
    USE_CLEAN_WAIT
    ui->iwImg->drawarea()->scale(computeValue(),0);
}

double MMaps::computeValue() const
{
    return ((double)ui->sldZoom->value())/100;
}

void MMaps::scaleWArea()
{
    USE_CLEAN_WAIT
    ui->iwWorld->drawarea()->scale(computeWValue(),0);
}

double MMaps::computeWValue() const
{
    return ((double)ui->sldWorldZoom->value())/100;
}

void MMaps::createCollection()
{
    //QString query2("select max(`id`)+1 from `image_collection`");

    //MQUERY_GETFIRST(q2,query2)
    //QString newid(q2.isNULL(0)?"1":q2.value(0));
    QString query("insert into `image_collection` (`name`,`comment`,`dirname`) values ('New Collection','','(directory)')");
    MQUERY(q,query)
    m_msg()->MsgOk();

    loadData();
}

void MMaps::createMap()
{
    MMapTreeItem * i(0);
    if(ui->treeImages->selectedItems().count()>0)
        i=(MMapTreeItem*)ui->treeImages->selectedItems().first();

    if(!i)
    {
        m_msg()->MsgWarn(tr("no collection selected"));
        return;
    }
    if(i->parent())
    {
        m_msg()->MsgWarn(tr("no collection selected"));
        return;
    }

    //QString query2("select max(`id`)+1 from `image`");

    //MQUERY_GETFIRST(q2,query2)
    //QString newid(q2.isNULL(0)?"1":q2.value(0));
    QString query("insert into `image` (`collection`,`name`,`comment`,`filename`,`ord`,`image`) values ("+QString::number(i->_id)+",'new map','','(filename)',0,null)");
    MQUERY(q,query)
    m_msg()->MsgOk();

    loadData();
}

void MMaps::editItem()
{
    MMapTreeItem * i((MMapTreeItem*)ui->treeImages->currentItem());
    if(i)
    {
        if(!i->parent())
        {
            MEditImgItem d(i->_map,i->_filename,i->_coord,i->_from_age,i->_to_age,true);
            if(d.exec()==QDialog::Accepted)
            {
                QString query("update `image_collection` set `name`='"+d.colName()+"',`dirname`='"+d.dir()+"' where `id`="+QString::number(i->_id));

                MQUERY(q,query)
                m_msg()->MsgOk();

                loadData();
            }
        }
        else
        {
            MEditImgItem d(i->_map,i->_filename,i->_coord,i->_from_age,i->_to_age,false);
            if(d.exec()==QDialog::Accepted)
            {
                QString query("update `image` set `name`='"+d.bookName()+"',`filename`='"+d.file()+"'");

                if(d.isAreaChecked())
                    query.append(",`comment`='"+d.coords()+"'");
                else
                    query.append(",`comment`=null");
                query.append(" where `id`="+QString::number(i->_id));

                MQUERY(q,query)
                m_msg()->MsgOk();

                loadData();
            }
        }
    }
    else
        m_msg()->MsgWarn(tr("no item selected"));
}

void MMaps::importImage()
{
    QList<QTreeWidgetItem*> l=ui->treeImages->selectedItems();

    if(l.count()<1)
        return;

    QMessageBox mb(QMessageBox::Question,tr("import image(s)"),QString::number(l.count())+tr(" images will be imported into database. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
    if(mb.exec()!=QMessageBox::Ok)
        return;

    for(int x=0;x<l.count();x++)
    {
        MMapTreeItem * i=(MMapTreeItem*)l.at(x);
        if(i)
        {
            MMapTreeItem * ipar((MMapTreeItem*)i->parent());
            if(ipar)
            {
                QFile f(m_sett()->marcDir+QDir::separator()+"data/maps"+QDir::separator()+ipar->_filename+QDir::separator()+i->_filename);

                    USE_CLEAN_WAIT
                    m_msg()->MsgMsg(tr("importing data from '")+f.fileName()+"' ...");

                    if(f.open(QIODevice::ReadOnly))
                    {
                        char ch;
                        int fo;
                        QByteArray imgdata;
                        do
                        {
                            fo=f.read(&ch,1);
                            if(fo==-1)
                            {
                                m_msg()->MsgMsg(tr("cannot read from file '")+f.fileName()+"'");
                                f.close();
                                return;
                            }
                            QString s(QString::number(*(unsigned char*)&ch,16));
                            if(s.length()==1)
                                s.prepend("0");
                            if(s.length()!=2)
                            {
                                f.close();
                                m_msg()->MsgMsg("corrupted data");
                                return;
                            }
                            imgdata.append(s);
                        }while(fo>0);
                        f.close();

                        QString query("update `image` set `image`='"+imgdata+"' where `id`="+QString::number(i->_id));
                        m_msg()->MsgMsg(tr("executing query ..."));
                        MQUERY_NOMSG(q,query)

                        m_msg()->MsgOk();
                    }
                    else
                        m_msg()->MsgMsg(tr("cannot open file '")+f.fileName()+tr("' for reading"));
                }
            }
    }
}

void MMaps::reorderMaps()
{
    MMapTreeItem * i((MMapTreeItem*)ui->treeImages->currentItem());
    if(!i->parent())
    {
        MReorderImageItem d(i->_id);
        if(d.exec()==QDialog::Accepted)
        {
            for(int x=0;x<d.itemCount();x++)
            {
                QString query("update `image` set `ord`="+QString::number(x+1)+" where `id`="+d.itemAt(x).id);
                MQUERY(q,query)
            }
            m_msg()->MsgOk();
            loadData();
        }
    }
    else
        m_msg()->MsgWarn(tr("no collection selected"));
}

void MMaps::on_btAction_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->btAction);
        on_treeImages_customContextMenuRequested(QPoint());
    }
}

void MMaps::on_treeImages_itemSelectionChanged()
{
    dropArea();

    QList<QTreeWidgetItem*> l(ui->treeImages->selectedItems());
    QList<QTreeWidgetItem*> l2(l);
    for(int x=0;x<l.count();x++)
    {
        MMapTreeItem * i=(MMapTreeItem*)l.at(x);
        if(!i->_is_image)
        {
            for(int y=0;y<i->childCount();y++)
            {
                QTreeWidgetItem * i2(i->child(y));
                if(!l2.contains(i2))
                    l2.append(i2);
            }
        }
    }
    bool area_found(false);
    QGraphicsRectItem *ri(0),*ri2(0);
    QGraphicsTextItem *ti(0);
    for(int x=0;x<l2.count();x++)
    {
        MMapTreeItem * i=(MMapTreeItem*)l2.at(x);
        if(i->_is_image)
        {
            QList<double> coords=i->_coord;
            while(coords.count()>=4)
            {
                ri=ri2=0;
                ti=0;
                double long_from=coords.first();
                coords.removeFirst();
                double lat_from=coords.first();
                coords.removeFirst();
                double long_to=coords.first();
                coords.removeFirst();
                double lat_to=coords.first();
                coords.removeFirst();

                int const gsw=ui->iwWorld->drawarea()->grScene()->width(),
                        gsh=ui->iwWorld->drawarea()->grScene()->height();

                double const long_g((double)gsw/360),
                        lat_g((double)gsh/180);
                QRectF r;
                r.setLeft((double)(gsw/2)+(long_from*long_g));
                r.setTop((double)(gsh/2)-(lat_from*lat_g));
                r.setRight((double)(gsw/2)+(long_to*long_g));
                r.setBottom((double)(gsh/2)-(lat_to*lat_g));

                QPen pen((QColor(Qt::white))),
                    bpen((QColor(Qt::black)));

                pen.setWidth(1);
                bpen.setWidth(1);
                QColor color(Qt::white);
                color.setAlpha(40);
                QBrush brush(color);

                QString const str(periodFromItem(i)+"\n"+i->_map);

                ri=ui->iwWorld->drawarea()->grScene()->addRect(r,pen,brush);
                if(ri)
                {
                    _areas.append(ri);
                    ri->setToolTip(str);
                }
                r.setTopLeft(QPointF(r.left()+1,r.top()+1));
                r.setBottomRight(QPoint(r.right()-1,r.bottom()-1));
                ri2=ui->iwWorld->drawarea()->grScene()->addRect(r,bpen);
                if(ri2)
                {
                    _areas.append(ri2);
                    ri2->setToolTip(str);
                }
                QFont f;
                f.setPointSize(f.pointSize()+1);
                f.setBold(true);

                ti=ui->iwWorld->drawarea()->grScene()->addText(str,f);
                if(ti)
                {
                    ti->setPos(r.topLeft().toPoint());
                    _areas.append(ti);
                    ti->setToolTip(str);
                }
                area_found=true;
            }
        }
    }
    ui->iwWorld->drawarea()->grScene()->update();
    if(area_found&&ui->wdgWZoomPanel->isEnabled())
    {
        ui->tabMaps->setCurrentIndex(1);
        if(ti)
        {
            ui->iwWorld->closeNavigator();
            ui->iwWorld->drawarea()->ensureVisible(ti,10,10);
        }
    }
}

QString MMaps::periodFromItem(MMapTreeItem * item) const
{
    QString from,
            to;

    if(item->_from_age==0)
    {
        return QString("*");
    }

    if(item->_from_age>0)
    {
        from=QString::number(item->_from_age);
        from.prepend("A.D. ");
    }
    else if(item->_from_age<0)
    {
        from=QString::number(item->_from_age*-1);
        from.append(" B.C.");
    }

    if(item->_from_age==item->_to_age)
        return from;

    if(item->_to_age==0)
    {
        from.prepend(tr("about "));
        return from;
    }

    if(item->_to_age>0)
    {
        to=QString::number(item->_to_age);
        to.prepend("A.D. ");
    }
    else if(item->_to_age<0)
    {
        to=QString::number(item->_to_age*-1);
        to.append(" B.C.");
    }

    return QString(from+" ~ "+to);
}

/*void MMaps::setMapArea()
{
    QTreeWidgetItem * i(ui->treeImages->currentItem());
    if(i->parent())
    {
        QString query("select `long`,`lat`,`tolong`,`tolat`,`x1`,`y1`,`x2`,`y2` from `image` where `id`="+i->text(3));
        MQUERY_GETFIRST(q,query)

        MMapLongLat d;
        if(q.isNULL(0)||q.isNULL(1)||q.isNULL(2)||q.isNULL(3))
            d.setNullValues();
        else
            d.setValues(q.value(0).toDouble(),q.value(1).toDouble(),q.value(2).toDouble(),q.value(3).toDouble());

        if(q.isNULL(4)||q.isNULL(5)||q.isNULL(6)||q.isNULL(7))
            d.setMapArea("null","null","null","null");
        else
            d.setMapArea(q.value(4),q.value(5),q.value(6),q.value(7));
        d.setSelection(ui->iwImg->drawarea()->selectionRect());

        if(d.exec()==QDialog::Accepted)
        {
            QString query2("update `image` set `long`="+d.longitude1()+",`lat`="+d.latitude1()+",`tolong`="+d.longitude2()+",`tolat`="+d.latitude2()+",`x1`="+d.x1()+",`y1`="+d.y1()+",`x2`="+d.x2()+",`y2`="+d.y2()+" where `id`="+i->text(3));
            MQUERY(q2,query2)
            m_msg()->MsgOk();
        }
    }
    else
        m_msg()->MsgWarn(tr("no map selected"));
}*/

void MMaps::slot_iwImg_resizeRequested(bool smaller)
{
    int const v(smaller?-10:10);
    ui->sldZoom->setValue(ui->sldZoom->value()+v);
}

void MMaps::slot_iwWorld_resizeRequested(bool smaller)
{
    int const v(smaller?-10:10);
    ui->sldWorldZoom->setValue(ui->sldZoom->value()+v);
}

void MMaps::slot_beforeSceneResized()
{
    dropArea();
}

void MMaps::slot_afterSceneResized()
{
    on_treeImages_itemSelectionChanged();
}

void MMaps::on_btCheckMaps_clicked()
{
    QRectF const sel_r=ui->iwWorld->drawarea()->selectionRectF();

    dropArea();

    bool area_found(false);
    QGraphicsRectItem *ri(0),*ri2(0);
    QGraphicsTextItem *ti(0);
    unsigned int maps_count(0);
    for(int x=0;x<_all_items.count();x++)
    {
        MMapTreeItem * i=_all_items.at(x);
        if(i->_is_image)
        {
            QList<double> coords=i->_coord;
            while(coords.count()>=4)
            {
                ri=ri2=0;
                ti=0;
                double long_from=coords.first();
                coords.removeFirst();
                double lat_from=coords.first();
                coords.removeFirst();
                double long_to=coords.first();
                coords.removeFirst();
                double lat_to=coords.first();
                coords.removeFirst();

                int const gsw=ui->iwWorld->drawarea()->grScene()->width(),
                        gsh=ui->iwWorld->drawarea()->grScene()->height();

                double const long_g((double)gsw/360),
                        lat_g((double)gsh/180);
                QRectF r;
                r.setLeft((double)(gsw/2)+(long_from*long_g));
                r.setTop((double)(gsh/2)-(lat_from*lat_g));
                r.setRight((double)(gsw/2)+(long_to*long_g));
                r.setBottom((double)(gsh/2)-(lat_to*lat_g));

                int const ta=i->_to_age==0?i->_from_age:i->_to_age;
                int const iv1=ta-i->_from_age,
                        iv2=ui->spnPeriodTo->value()-ui->spnPeriodFrom->value();
                int const ivsm=i->_from_age<ui->spnPeriodFrom->value()?i->_from_age:ui->spnPeriodFrom->value(),
                    ivlr=ta>ui->spnPeriodTo->value()?ta:ui->spnPeriodTo->value();

                if(r.intersects(sel_r)||sel_r.isNull())
                    if((((ivlr-ivsm)<=(iv1+iv2)||!ui->gboxPeriod->isChecked())&&i->_from_age!=0)||
                            (i->_from_age==0&&ui->cbAgeless->isChecked()))
                    {
                        QPen pen((QColor(Qt::white))),
                            bpen((QColor(Qt::black)));

                        pen.setWidth(1);
                        bpen.setWidth(1);
                        QColor color(Qt::white);
                        color.setAlpha(40);
                        QBrush brush(color);

                        QString const str(periodFromItem(i)+"\n"+i->_map);

                        ri=ui->iwWorld->drawarea()->grScene()->addRect(r,pen,brush);
                        if(ri)
                        {
                            _areas.append(ri);
                            ri->setToolTip(str);
                        }
                        r.setTopLeft(QPointF(r.left()+1,r.top()+1));
                        r.setBottomRight(QPoint(r.right()-1,r.bottom()-1));
                        ri2=ui->iwWorld->drawarea()->grScene()->addRect(r,bpen);
                        if(ri2)
                        {
                            _areas.append(ri2);
                            ri2->setToolTip(str);
                        }
                        QFont f;
                        f.setPointSize(f.pointSize()+1);
                        f.setBold(true);
                        ti=ui->iwWorld->drawarea()->grScene()->addText(str,f);
                        if(ti)
                        {
                            ti->setPos(r.topLeft().toPoint());
                            _areas.append(ti);
                            ti->setToolTip(str);
                        }
                        area_found=true;

                        MMapTreeItem * n_item=new MMapTreeItem(*i);
                        if(n_item)
                        {
                            QString n_s(n_item->_map);
                            if(n_item->_parentItem)
                                n_s.prepend(n_item->_parentItem->_map+", ");
                            n_item->setText(0,n_s);
                            n_item->setToolTip(0,n_s);
                            ui->treeMapLoc->addTopLevelItem(n_item);
                            maps_count++;
                        }
                    }
            }
        }
    }
    ui->iwWorld->drawarea()->grScene()->update();
    if(area_found&&ui->wdgWZoomPanel->isEnabled())
    {
        ui->dwMapLoc->show();
        ui->treeMapLoc->setEnabled(true);
        ui->treeMapLoc->headerItem()->setText(0,tr("detected maps (")+QString::number(maps_count)+")");
        ui->tabMaps->setCurrentIndex(1);
        if(ti)
        {
            ui->iwWorld->closeNavigator();
            ui->iwWorld->drawarea()->ensureVisible(ti,10,10);
        }
    }
}

void MMaps::slot_iwWorld_selectionChanged(QRectF selection)
{
    ui->wdgCheckMaps->setEnabled(!selection.isNull());
    ui->actionCopy_coordinates->setEnabled(!selection.isNull());
}

void MMaps::on_spnPeriodFrom_valueChanged(int arg1)
{
    if(arg1>ui->spnPeriodTo->value())
        ui->spnPeriodTo->setValue(arg1);
}

void MMaps::on_spnPeriodTo_valueChanged(int arg1)
{
    if(arg1<ui->spnPeriodFrom->value())
        ui->spnPeriodFrom->setValue(arg1);
}

void MMaps::on_treeMapLoc_itemDoubleClicked(QTreeWidgetItem * item, int)
{
    if(item)
        on_treeImages_itemDoubleClicked(item,0);
}

void MMaps::on_treeMapLoc_customContextMenuRequested(const QPoint &)
{
    QTreeWidgetItem * item=ui->treeMapLoc->currentItem();
    a_openloc->setEnabled(item);
    QAction *a=popupLoc.exec(QCursor::pos());
    if(a)
        if(a==a_openloc)
            on_treeMapLoc_itemDoubleClicked(item,0);
}

void MMaps::on_actionClose_triggered()
{
    close();
}

void MMaps::on_actionAll_maps_triggered(bool checked)
{
    ui->dwTree->setVisible(checked);
}

void MMaps::on_actionDetected_maps_triggered(bool checked)
{
    ui->dwMapLoc->setVisible(checked);
}

void MMaps::on_dwTree_visibilityChanged(bool visible)
{
    ui->actionAll_maps->setChecked(visible);
}

void MMaps::on_dwMapLoc_visibilityChanged(bool visible)
{
    ui->actionDetected_maps->setChecked(visible);
}

void MMaps::dropArea()
{
    for(int x=0;x<_areas.count();x++)
    {
        QGraphicsItem * ri=_areas.at(x);
        ui->iwWorld->drawarea()->grScene()->removeItem(ri);
        delete ri;
    }
    _areas.clear();
    dropLastArea();
    ui->dwMapLoc->hide();
    ui->treeMapLoc->clear();
    ui->treeMapLoc->setEnabled(false);
    ui->treeMapLoc->headerItem()->setText(0,tr("detected maps (0)"));
}

void MMaps::dropLastArea()
{
    if(_last_area)
    {
        ui->iwWorld->drawarea()->grScene()->removeItem(_last_area);
        delete _last_area;
        _last_area=0;
    }
}

void MMaps::on_treeMapLoc_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *)
{
    dropLastArea();
    if(!current)
        return;
    MMapTreeItem * i=(MMapTreeItem*)current;
    if(i->_is_image)
    {
        QList<double> coords=i->_coord;
        while(coords.count()>=4)
        {
            double long_from=coords.first();
            coords.removeFirst();
            double lat_from=coords.first();
            coords.removeFirst();
            double long_to=coords.first();
            coords.removeFirst();
            double lat_to=coords.first();
            coords.removeFirst();

            int const gsw=ui->iwWorld->drawarea()->grScene()->width(),
                    gsh=ui->iwWorld->drawarea()->grScene()->height();

            double const long_g((double)gsw/360),
                    lat_g((double)gsh/180);
            QRectF r;
            r.setLeft((double)(gsw/2)+(long_from*long_g));
            r.setTop((double)(gsh/2)-(lat_from*lat_g));
            r.setRight((double)(gsw/2)+(long_to*long_g));
            r.setBottom((double)(gsh/2)-(lat_to*lat_g));

            QPen pen((QColor(Qt::red)));
            pen.setWidth(1);

            _last_area=ui->iwWorld->drawarea()->grScene()->addRect(r,pen);
            ui->iwWorld->drawarea()->grScene()->update();
            if(_last_area&&ui->wdgWZoomPanel->isEnabled())
            {
                ui->tabMaps->setCurrentIndex(1);
                ui->iwWorld->closeNavigator();
                ui->iwWorld->drawarea()->ensureVisible(_last_area,10,10);
            }
        }
    }
}

void MMaps::on_actionCopy_coordinates_triggered()
{
    QSizeF csize(ui->iwWorld->drawarea()->currentPageSize());
    if(csize.isValid())
    {
        QRectF const r=ui->iwWorld->drawarea()->selectionRectF();
        double const onedlong=(double)csize.width()/360,onedlat=(double)csize.height()/180;
        int x((int)r.left()),y((int)r.top());
        double longitude=((double)x/onedlong)-180,
               latitude=(((double)y/onedlat)-90)*-1;

        QString rv(QString::number(longitude,'f',2)+";"+QString::number(latitude,'f',2)+";");

        x=(int)r.right(); y=(int)r.bottom();
        longitude=((double)x/onedlong)-180;
        latitude=(((double)y/onedlat)-90)*-1;

        rv.append(QString::number(longitude,'f',2)+";"+QString::number(latitude,'f',2));

        QApplication::clipboard()->setText(rv);
    }
}

//

MMapTreeItem::MMapTreeItem()
    :QTreeWidgetItem(),_parentItem(0),
      _map(),_filename(),_id(0),_is_image(false),
      _from_age(0),_to_age(0),_coord()
{
}

MMapTreeItem::MMapTreeItem(MMapTreeItem const & other)
    :QTreeWidgetItem(),_parentItem(other._parentItem),
      _map(other._map),_filename(other._filename),_id(other._id),_is_image(other._is_image),
      _from_age(other._from_age),_to_age(other._to_age),_coord(other._coord)
{
}
