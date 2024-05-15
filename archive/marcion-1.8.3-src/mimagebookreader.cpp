#include "mimagebookreader.h"
#include "ui_mimagebookreader.h"

MImageBookReader::MImageBookReader(QString const & filename,QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MImageBookReader),
    filename(filename),
    _gk(0),_cop(0),_num(0),_heb(0)
{
    ui->setupUi(this);

    ui->wdgHeader->initFirstButton(QIcon(":/new/icons/icons/image.png"),tr("&images"));
    ui->wdgHeader->setStWdg(ui->stwImg);

    ui->cmbRot->addItem("0"+QString(0x00B0),(qreal)0);
    ui->cmbRot->addItem("90"+QString(0x00B0),(qreal)90);
    ui->cmbRot->addItem("180"+QString(0x00B0),(qreal)180);
    ui->cmbRot->addItem("270"+QString(0x00B0),(qreal)270);

    ui->treeImages->hideColumn(1);
    ui->treeImages->hideColumn(2);

    ui->iwImg->drawarea()->setSizePolicy(QSizePolicy::Expanding,
                           QSizePolicy::Expanding);
    ui->iwImg->drawarea()->setImageMode(CMImage::Image);


    ui->splitter->setStretchFactor(0,0);
    ui->splitter->setStretchFactor(1,1);

    connect(ui->iwImg->drawarea(),SIGNAL(resizeRequested(bool)),this,SLOT(slot_iwImg_resizeRequested(bool)));

    QList<int> li;
    li << 1 << 1;
    ui->splitter->setSizes(li);

    loadTree(filename);
    //ui->iwImg->drawarea()->loadPage(filename,computeValue());

    ICTB_SIZES
}

MImageBookReader::~MImageBookReader()
{
    RM_WND;

    if(_gk)
        delete _gk;
    if(_cop)
        delete _cop;
    if(_num)
        delete _num;

    delete ui;
}

//

void MImageBookReader::loadTree(QString const & f)
{
    QFileInfo fi(f);
    QDir dir(fi.dir());

    QFileInfoList fl=dir.entryInfoList(QDir::Files|QDir::NoDotAndDotDot);

    QTreeWidgetItem * it(0);
    for(int x=0;x<fl.count();x++)
    {
        QString fn(fl.at(x).fileName());
        if(fn.indexOf(m_sett()->imageFormatsRegExp())!=-1)
        {
            QTreeWidgetItem * i=new QTreeWidgetItem(0);
            QString afn(fl.at(x).absoluteFilePath());
            i->setText(0,fn);
            i->setText(1,afn);
            i->setIcon(0,QIcon(":/new/icons/icons/image.png"));
            ui->treeImages->addTopLevelItem(i);
            if(fi.fileName().compare(fl.at(x).fileName())==0)
                it=i;
        }
    }
    ui->treeImages->sortItems(0,Qt::AscendingOrder);
    if(it)
        ui->treeImages->setCurrentItem(it);
    //it->setSelected(true);
}

/*void MImageBookReader::on_spnZoom_valueChanged(double newval)
{
    drawarea.scale(newval);
    //messages->MsgMsg("scaled");
    ui->sldZoom->setValue((int)(newval*(double)100));
}*/

void MImageBookReader::on_btZ1_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100);
    //scaleArea();
}

void MImageBookReader::on_btZ2_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(200);
    //scaleArea();
}

void MImageBookReader::on_btZ3_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(300);
    //scaleArea();
}

void MImageBookReader::on_btZ4_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(400);
    //scaleArea();
}

/*void MImageBookReader::checkZoomB(QToolButton * b)
{
    ui->btZ1->setChecked(false);
    ui->btZ2->setChecked(false);
    ui->btZ3->setChecked(false);
    ui->btZ4->setChecked(false);
    ui->btZD2->setChecked(false);
    ui->btZD3->setChecked(false);
    ui->btZD4->setChecked(false);
    ui->btZD5->setChecked(false);
    b->setChecked(true);
}*/

void MImageBookReader::on_btZD2_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/2);
    //scaleArea();
}

void MImageBookReader::on_btZD5_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/5);
    //scaleArea();
}

void MImageBookReader::on_btZD4_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/4);
    //scaleArea();
}

void MImageBookReader::on_btZD3_clicked()
{
    //checkZoomB((QToolButton*)this->sender());
    ui->sldZoom->setValue(100/3);
    //scaleArea();
}

void MImageBookReader::on_treeImages_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    int ci(ui->cmbRot->currentIndex());
    if(current&&ci!=-1)
        ui->wdgImgZoomPanel->setEnabled(ui->iwImg->drawarea()->loadPage(current->text(1),computeValue(),ui->cmbRot->itemData(ci).toDouble()));
}

void MImageBookReader::on_sldZoom_valueChanged(int value)
{
    double v(((double)value)/100);
    ui->lblValue->setText("x"+QString::number(v,'f',2));
    if(!ui->sldZoom->isSliderDown())
        scaleArea();
}

void MImageBookReader::on_sldZoom_sliderReleased()
{
    scaleArea();
}

void MImageBookReader::scaleArea()
{
    USE_CLEAN_WAIT
    int ci(ui->cmbRot->currentIndex());
    if(ci!=-1)
        ui->iwImg->drawarea()->scale(computeValue(),ui->cmbRot->itemData(ci).toDouble());
}

double MImageBookReader::computeValue() const
{
    return ((double)ui->sldZoom->value())/100;
}

void MImageBookReader::on_cmbRot_currentIndexChanged(int index)
{
    if(index!=-1)
        ui->iwImg->drawarea()->scale(computeValue(),ui->cmbRot->itemData(index).toDouble());
}

void MImageBookReader::slot_iwImg_resizeRequested(bool smaller)
{
    int const v(smaller?-10:10);
    ui->sldZoom->setValue(ui->sldZoom->value()+v);
}

void MImageBookReader::on_btZoomPlus_clicked()
{
    slot_iwImg_resizeRequested(false);
}

void MImageBookReader::on_btZoomMinus_clicked()
{
    slot_iwImg_resizeRequested(true);
}

void MImageBookReader::on_actionClose_triggered()
{
    close();
}

void MImageBookReader::on_actionGk_Lat_dictionary_triggered()
{
    if(!_gk)
    {
        _gk=new CLSJ(m_msg());
        ui->wdgHeader->initPage(MDocHeader::GkDict,ui->stwImg->addWidget(_gk));
    }
    ui->wdgHeader->setDocMode(MDocHeader::GkDict);
}

void MImageBookReader::on_actionCoptic_dictionary_triggered()
{
    if(!_cop)
    {
        _cop=new CWordPreview(m_msg());
        ui->wdgHeader->initPage(MDocHeader::CopDict,ui->stwImg->addWidget(_cop));
    }
    ui->wdgHeader->setDocMode(MDocHeader::CopDict);
}

void MImageBookReader::on_actionNumeric_converter_triggered()
{
    if(!_num)
    {
        _num=new MCopticNumerals(0,true);
        ui->wdgHeader->initPage(MDocHeader::NumConv,ui->stwImg->addWidget(_num));
    }
    ui->wdgHeader->setDocMode(MDocHeader::NumConv);
}

void MImageBookReader::on_action_Hebrew_dictionary_triggered()
{
    if(!_heb)
    {
        _heb=new MHebrDict();
        ui->wdgHeader->initPage(MDocHeader::HebDict,ui->stwImg->addWidget(_heb));
    }
    ui->wdgHeader->setDocMode(MDocHeader::HebDict);
}
