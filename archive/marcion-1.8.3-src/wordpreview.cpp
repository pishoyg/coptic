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

#include "wordpreview.h"
#include "ui_wordpreview.h"

//
unsigned int CWordPreview::count=0;

CWordPreview::CWordPreview( CMessages * const messages,
QWidget * parent)
        : QWidget(parent),
          ui(new Ui::frmWordPreview),
          messages(messages),
        _crumw(0),
          _gkdict(0),
          crumw_index(0),gkdict_index(0),
          bgr(),
          popup(),
        _store(),_store_tbr(),_store_tbr2(),
          cmbw_delegate(0,true),
          cmbd_delegate(0,true),
          treeres_delegate(0,true),
          childs_delegate(0,true)
{
        ui->setupUi(this);

        ui->wdgDictHeader->hide();
        ui->tbDictPrinted->hide();
        ui->tbDictGk->hide();

        bgr.addButton(ui->tbDictQuery,1);
        bgr.addButton(ui->tbDictPrinted,2);
        bgr.addButton(ui->tbDictGk,3);
        bgr.setExclusive(true);

        connect(&bgr,SIGNAL(buttonClicked(int)),this,SLOT(slot_bgr_clicked(int)));

        ui->cmbW->setItemDelegate(&cmbw_delegate);
        ui->cmbD->setItemDelegate(&cmbd_delegate);
        ui->treeResult->setItemDelegate(&treeres_delegate);
        ui->cmbChilds->setItemDelegate(&childs_delegate);

        ui->wdgQuot->hide();

        ui->treeResult->init(messages/*,this,&CWordPreview::format*/);
        ui->btAutoHL->setChecked(m_sett()->copDictAutoHL());
        bool cdtt;
        ui->treeResult->setShowToolTips(cdtt=m_sett()->copDictToolTips());

        ui->brPreview->init(QString(),CBookTextBrowser::Coptic);
        ui->tbrOne->init(QString(),CBookTextBrowser::Coptic);
        ui->tbrTwo->init(QString(),CBookTextBrowser::Coptic);

        settings_fontChanged(CTranslit::Copt, m_sett()->bFont(CTranslit::Copt));
        settings_fontChanged(CTranslit::Greek, m_sett()->bFont(CTranslit::Greek));
        settings_fontChanged(CTranslit::Latin, m_sett()->bFont(CTranslit::Latin));

        connect(&messages->settings(),SIGNAL(fontChanged(CTranslit::Script, QFont)),this,SLOT(settings_fontChanged(CTranslit::Script, QFont)));

        ui->brPreview->inputBox().setSwitchState(true);
        ui->tbrOne->inputBox().setSwitchState(true);
        ui->tbrTwo->inputBox().setSwitchState(true);
        ui->brPreview->inputBox().allowChangeScript();
        ui->tbrOne->inputBox().allowChangeScript();
        ui->tbrTwo->inputBox().allowChangeScript();

        //brPreview->setInfoPanelVisibility(true);
        ui->tbrOne->setInfoPanelVisibility(false);
        ui->tbrTwo->setInfoPanelVisibility(false);

        connect(ui->brPreview->browser(),SIGNAL(anchorClicked(const QUrl)),this,SLOT(slot_brPreview_anchorClicked(QUrl)));
        connect(ui->tbrOne->browser(),SIGNAL(anchorClicked(const QUrl)),this,SLOT(slot_tbrOne_anchorClicked(QUrl)));
        connect(ui->tbrTwo->browser(),SIGNAL(anchorClicked(const QUrl)),this,SLOT(slot_tbrTwo_anchorClicked(QUrl)));


        (show_panel=popup.addAction(tr("&show/hide panel")))->setCheckable(true);
        show_panel->setShortcut(QKeySequence("Ctrl+Alt+F"));
        (a_labels=popup.addAction(tr("s&how/hide floating labels")))->setCheckable(true);
        a_labels->setShortcut(QKeySequence("Ctrl+Alt+L"));
        show_panel->setChecked(true);
        a_labels->setChecked(cdtt);
        popup.addSeparator();
        clr=popup.addAction(tr("&clear"));
        clr->setShortcut(QKeySequence("Ctrl+Alt+D"));
        a_exp=popup.addAction(tr("&expand all"));
        a_coll=popup.addAction(tr("c&ollapse all"));
        /*a_wrap=popup.addAction("wrap");
        a_wrap->setCheckable(true);
        a_wrap->setChecked(false);*/
        popup.addSeparator();
        resolve=popup.addAction(tr("&resolve"));
        resolve->setShortcut(QKeySequence("Ctrl+Alt+R"));
        a_srchregexp=popup.addAction(QIcon(":/new/icons/icons/loupe.png"),tr("se&arch in library"));
        a_srchregexp->setShortcut(QKeySequence("Ctrl+Alt+S"));
        a_cpregexp=popup.addAction(QIcon(":/new/icons/icons/copy.png"),tr("co&py as regexp"));
        a_cpregexp->setShortcut(QKeySequence("Ctrl+Alt+C"));

        setWindowTitle(tr("Coptic dictionary (")+QString::number(++count)+")");
        //setWindowIcon(QIcon());

        ui->dtFrom->setDate(QDate::currentDate());
        ui->dtTo->setDate(QDate::currentDate());

        ui->inpWord->setScript(CTranslit::Copt);
        ui->inpWord->setTr(CTranslit::CopticTrToCopticN);
        ui->inpWord->setSwitchState(true);
        ui->inpWord->setSwitch(true);

        ui->trGreek->setScript(CTranslit::Greek);
        ui->trGreek->setSwitch(false);
        ui->trGreek->setSwitchState(true);
        //ui->trGreek->setMaxInputChars(99);

        ui->spnLimit->setValue(m_sett()->queryResultsCount());

	for(int x=0;x<=CRUM_COUNT;x++)
                ui->cmbCrum->addItem(QString::number(x+1));

        if(!messages->settings().isCopticEditable())
        {
            ui->btFullW->setVisible(false);
            ui->btFullD->setVisible(false);
        }

        ui->tbPreview->setCurrentIndex(0);
        ui->stwView->setCurrentIndex(0);

        checkalld(true);
        beforequery();

        printInfo();

        //ui->inpWord->setMaxInputChars(99);
        ui->inpWord->activate();

        IC_SIZES
}

CWordPreview::~CWordPreview()
{
    RM_WND;

    if(_crumw)
        delete _crumw;

    delete ui;
}

//

CCrumResultTree * CWordPreview::resultTree() const {return ui->treeResult;}

CCrumWidget * CWordPreview::crumw()
{
    if(!_crumw)
    {
        _crumw=new CCrumWidget(m_msg());
        crumw_index=ui->stwDict->addWidget(_crumw);
        ui->wdgDictHeader->show();
        ui->tbDictPrinted->show();
    }
    return _crumw;
}

CLSJ * CWordPreview::gkdict()
{
    if(!_gkdict)
    {
        _gkdict=new CLSJ(m_msg());
        gkdict_index=ui->stwDict->addWidget(_gkdict);
        ui->wdgDictHeader->show();
        ui->tbDictGk->show();
    }

    return _gkdict;
}

void CWordPreview::slot_bgr_clicked(int id)
{
    switch(id)
    {
    case 1 :
        ui->stwDict->setCurrentIndex(0);
        break;
    case 2 :
        ui->stwDict->setCurrentIndex(crumw_index);
        break;
    case 3 :
        ui->stwDict->setCurrentIndex(gkdict_index);
        break;
    }

}

void CWordPreview::showPage(Pg current_page)
{
    switch(current_page)
    {
    case Search :
        ui->tbDictQuery->click();
        break;
    case Printed :
        ui->tbDictPrinted->click();
        break;
    case DictGk :
        ui->tbDictGk->click();
        break;
    }
}

void CWordPreview::keyPressEvent(QKeyEvent * event)
{
    event->ignore();
    bool const tree(ui->tbPreview->currentIndex()==1);

    if(tree)
    {
        ui->tbrOne->keyPressEvent(event);
        ui->tbrTwo->keyPressEvent(event);
    }
    else
        ui->brPreview->keyPressEvent(event);

    if(!event->isAccepted())
    {
        if(event->modifiers()==(Qt::ControlModifier+Qt::AltModifier))
        {
            switch(event->key())
            {
            case Qt::Key_D:
                if(tree)
                {
                    clearTree();
                    event->accept();
                    break;
                }
            case Qt::Key_L:
                a_labels->setChecked(!a_labels->isChecked());
                ui->treeResult->setShowToolTips(a_labels->isChecked());
                event->accept();
                break;
            case Qt::Key_F:
                show_panel->setChecked(!show_panel->isChecked());
                ui->wdgTopPanel->setVisible(show_panel->isChecked());
                event->accept();
                break;
            case Qt::Key_R:
            {
                if(tree)
                {
                    CResultItem * ri((CResultItem *)ui->treeResult->currentItem());
                    if(ri)
                        resolveLine(ri);
                    event->accept();
                    break;
                }
            }
            case Qt::Key_S:
            {
                if(tree)
                {
                    CResultItem * ri((CResultItem *)ui->treeResult->currentItem());
                    if(ri)
                        messages->libSearchWidget().searchCoptic(copyAsRegexp(ri));
                    event->accept();
                    break;
                }
            }
            case Qt::Key_C:
            {
                if(tree)
                {
                    CResultItem * ri((CResultItem *)ui->treeResult->currentItem());
                    if(ri)
                        copyAsRegexp(ri);
                    event->accept();
                    break;
                }
            }
            default:
                break;
            }
        }

        if(event->modifiers()==Qt::MetaModifier)
        {
            switch(event->key())
            {
            case Qt::Key_F1 :
                ui->tbPreview->setCurrentIndex(0);
                event->accept();
                break;
            case Qt::Key_F2 :
                ui->tbPreview->setCurrentIndex(1);
                event->accept();
                break;
            }
        }

        if(event->modifiers()==(Qt::AltModifier+Qt::MetaModifier))
        {
            switch(event->key())
            {
            case Qt::Key_F1 :
                ui->tabQuery->setCurrentIndex(0);
                event->accept();
                break;
            case Qt::Key_F2 :
                ui->tabQuery->setCurrentIndex(1);
                event->accept();
                break;
            case Qt::Key_F3 :
                ui->tabQuery->setCurrentIndex(2);
                event->accept();
                break;
            case Qt::Key_F4 :
                ui->tabQuery->setCurrentIndex(3);
                event->accept();
                break;
            case Qt::Key_F5 :
                ui->tabQuery->setCurrentIndex(4);
                event->accept();
                break;
            }
        }

        if(!event->isAccepted())
            QWidget::keyPressEvent(event);
    }
}

int CWordPreview::dialects() const
{
	int r=0;
        if(ui->cbS->isChecked())
		r|=CDialects3::Sah;
        if(ui->cbSa->isChecked())
		r|=CDialects3::SahA;
        if(ui->cbSf->isChecked())
		r|=CDialects3::SahF;
        if(ui->cbAch->isChecked())
		r|=CDialects3::Achm;
        if(ui->cbsA->isChecked())
		r|=CDialects3::AchmSub;
        if(ui->cbBoh->isChecked())
		r|=CDialects3::Boh;
        if(ui->cbF->isChecked())
		r|=CDialects3::Fay;
        if(ui->cbFb->isChecked())
		r|=CDialects3::FayB;
        if(ui->cbO->isChecked())
		r|=CDialects3::Old;
        if(ui->cbNH->isChecked())
            r|=CDialects3::NagHamm;

	return r;
}

QString CWordPreview::dialectsAsStr() const
{
    QString r("(");
    if(ui->cbS->isChecked())
            r.append("S,");
    if(ui->cbSa->isChecked())
            r.append("Sa,");
    if(ui->cbSf->isChecked())
            r.append("Sf,");
    if(ui->cbAch->isChecked())
            r.append("A,");
    if(ui->cbsA->isChecked())
            r.append("sA,");
    if(ui->cbBoh->isChecked())
            r.append("B,");
    if(ui->cbF->isChecked())
            r.append("F,");
    if(ui->cbFb->isChecked())
            r.append("Fb,");
    if(ui->cbO->isChecked())
            r.append("O,");
    if(ui->cbNH->isChecked())
        r.append("NH,");

    if(r.count()>1)
    {
        r.chop(1);
        r.append(")");
    }
    else
        r="(none)";

    return r;
}

/*void CWordPreview::prepareCreateIndex()
{
    tabQuery->setCurrentIndex(0);
    rbRegexp->setChecked(true);
    inpWord->setText(".*");
    on_btQuery_clicked();
    on_btAllInTree_clicked();
}*/
void CWordPreview::startQuery()
{
    cmbw_delegate.setRExp(QRegExp());
    cmbd_delegate.setRExp(QRegExp());
    treeres_delegate.setRExp(QRegExp());
    childs_delegate.setRExp(QRegExp());

    ui->treeResult->setSearchedText(QString());

    switch(ui->tabQuery->currentIndex())
    {
            case 0 : //coptic
            case 1 :
            {
                if(ui->rbRegexp->isChecked()&&ui->inpWord->text().isEmpty())
                    ui->inpWord->setText(".*");

                QString const na(QString(ui->inpWord->updateL(ui->rbExact->isChecked(),CTranslit::TrimAndKeepOne)).remove(' '));
                QString st(ui->inpWord->text_utf8().remove(QRegExp("^\\^")).remove(QRegExp("\\$$")));
                ui->treeResult->setSearchedText(st);
                QRegExp r(st,
                          Qt::CaseSensitive,
                          QRegExp::RegExp);
                r.setMinimal(true);
                cmbw_delegate.setRExp(r);
                cmbd_delegate.setRExp(r);
                treeres_delegate.setRExp(r);
                childs_delegate.setRExp(r);

                QString where;

                if(ui->rbDirect->isChecked())
                    where="compare_d(`word`,'"+na
                +
                "',"+(ui->rbExact->isChecked()?"0":(ui->rbLike->isChecked()?"1":"2"))+
                ","+QString::number(dialects())+","+
                (ui->cbAll->isChecked()?"1":"0")+") and `type`<>99";
                else
                {
                    QString aup,aua;
                    if(ui->cbAll->isChecked())
                    {
                        aup="(";
                        aua=" or `crum_index`.`dialect`=0)";
                    }

                    if(ui->rbExact->isChecked())
                        where=aup+QString::number(dialects())+"&`crum_index`.`dialect` "+aua+" and `crum_index`.`word` = binary '"+na+"'";
                    else if(ui->rbLike->isChecked())
                        where=aup+QString::number(dialects())+"&`crum_index`.`dialect` "+aua+" and `crum_index`.`word` like binary '"+na+"'";
                    else if(ui->rbRegexp->isChecked())
                        where=aup+QString::number(dialects())+"&`crum_index`.`dialect`"+aua+" and `crum_index`.`word` regexp binary '"+na+"'";

                }

                query(where);
                //ui->inpWord->setText(na);

                if(ui->btAutoHL->isChecked())
                {
                    ui->brPreview->inputBox().setScript(CTranslit::Copt);
                    ui->tbrOne->inputBox().setScript(CTranslit::Copt);
                    ui->tbrTwo->inputBox().setScript(CTranslit::Copt);

                    ui->brPreview->setRegExp();
                    ui->tbrOne->setRegExp();
                    ui->tbrTwo->setRegExp();

                    ui->brPreview->setWordsChecked(true);
                    ui->tbrOne->setWordsChecked(true);
                    ui->tbrTwo->setWordsChecked(true);

                    ui->brPreview->inputBox().setText(ui->inpWord->text());
                    ui->tbrOne->inputBox().setText(ui->inpWord->text());
                    ui->tbrTwo->inputBox().setText(ui->inpWord->text());

                    ui->brPreview->highlightText(true);
                    ui->tbrOne->highlightText(true);
                    ui->tbrTwo->highlightText(true);
                }

                break;
            }
            case 2 : //english
            {
                    QString where(QString(ui->rbEnglish->isChecked()?
                    "`en`":"`cz`")+
                    " like '%"+ui->txtCzEn->text()+"%'");

                    query(where);

                    if(ui->btAutoHL->isChecked())
                    {
                        ui->brPreview->inputBox().setScript(CTranslit::Latin);
                        ui->tbrOne->inputBox().setScript(CTranslit::Latin);
                        ui->tbrTwo->inputBox().setScript(CTranslit::Latin);

                        ui->brPreview->setRegExp();
                        ui->tbrOne->setRegExp();
                        ui->tbrTwo->setRegExp();

                        ui->brPreview->inputBox().setText(ui->txtCzEn->text());
                        ui->tbrOne->inputBox().setText(ui->txtCzEn->text());
                        ui->tbrTwo->inputBox().setText(ui->txtCzEn->text());

                        ui->brPreview->highlightText(true);
                        ui->tbrOne->highlightText(true);
                        ui->tbrTwo->highlightText(true);
                    }

                    break;
            }
            case 3 : //greek
            {
                    QString where("`gr` like '%"+ui->trGreek->text()+"%'");

                    query(where);
                    if(ui->btAutoHL->isChecked())
                    {
                        ui->brPreview->inputBox().setScript(CTranslit::Greek);
                        ui->tbrOne->inputBox().setScript(CTranslit::Greek);
                        ui->tbrTwo->inputBox().setScript(CTranslit::Greek);

                        ui->brPreview->setRegExp();
                        ui->tbrOne->setRegExp();
                        ui->tbrTwo->setRegExp();

                        ui->brPreview->inputBox().setText(ui->trGreek->text());
                        ui->tbrOne->inputBox().setText(ui->trGreek->text());
                        ui->tbrTwo->inputBox().setText(ui->trGreek->text());

                        ui->brPreview->highlightText(true);
                        ui->tbrOne->highlightText(true);
                        ui->tbrTwo->highlightText(true);
                    }

                    break;
            }
            case 4 : //misc
            {
                    if(ui->rbCrumPg->isChecked())
                    {
                        QString page;
                        if(ui->cbA->isChecked()&&ui->cbB->isChecked())
                                page="_";
                        else if(ui->cbA->isChecked())
                                page="a";
                        else if(ui->cbB->isChecked())
                                page="b";
                        else
                                page="_";

                        QString where("`crum` like '"+ui->cmbCrum->
                        lineEdit()->text()+page+"'");

                        query(where);
                    }
                    else if(ui->rbIdSearch->isChecked())
                    {
                        queryId(ui->cmbIdType->currentIndex()+1,ui->spnId->value());
                    }
                    else if(ui->rbDate->isChecked())
                    {
                        QString df(ui->dtFrom->date().toString("yyyy-MM-dd")),
                            dt(ui->dtTo->date().toString("yyyy-MM-dd"));
                        QString wherec("(`added`>='"+df+"' and `added`<='"+dt+"') or "),
                            whereu("(`updated`>='"+df+"' and `updated`<='"+dt+"') or "),where;
                        if(ui->cbCrtS->isChecked())
                            where.append(wherec);
                        if(ui->cbUpdS->isChecked())
                            where.append(whereu);

                        where.remove(QRegExp(" or $"));
                        if(!where.isEmpty())
                            query(where);
                    }

                    break;
            }
    }
}

void CWordPreview::on_btQuery_clicked()
{
    if(ui->tabQuery->currentIndex()==0)
        ui->inpWord->updateHistory();
    startQuery();
}

void CWordPreview::slot_brPreview_anchorClicked(QUrl url)
{
    //messages->MsgMsg("anchor clicked");
	QString action=url.toString();

	if(action.leftRef(4)=="crum")
	{
        crumw()->showPage(action.mid(4,action.length()-5).toInt()-3+CRUM_FIRST);
        showPage(Printed);
	}
        else if(action.startsWith("tree"))
        {
            int pos=action.mid(5).toInt();
            QString mode(action.mid(4,1));
            if(mode==QString("w"))
            {
                ui->cmbW->setCurrentIndex(pos-1);
                ui->btTreeW->click();
            }
            else if(mode==QString("d"))
            {
                ui->cmbD->setCurrentIndex(pos-1);
                ui->btTreeD->click();
            }
        }
	else if(action.leftRef(4)=="edit")
	{
		int key=action.mid(5).toInt();
		QString mode(action.mid(4,1));

                CAddWord * aw=new CAddWord(messages,key,
                mode==QString("w")?
		CAddWord::UpdateWord:CAddWord::UpdateDeriv);

                //messages->settings().mdiArea()->addSubWindow(aw)->setWindowIcon(QIcon(":/new/icons/icons/addw.png"));
                aw->show();
	}
	else if(action.leftRef(4)=="full")
	{
		showfull(action.mid(4));
	}
	else if(action.leftRef(4)=="addd")
	{
		int key=action.mid(5).toInt();

                CAddWord * aw=new CAddWord(messages,key,
		CAddWord::InsertDeriv);

                //messages->settings().mdiArea()->addSubWindow(aw)->setWindowIcon(QIcon(":/new/icons/icons/addw.png"));
                aw->show();
	}
	else if(action.leftRef(4)=="cord")
		reorder(action.mid(4));
        else if(action.leftRef(3)=="ext")
        {
            QString l(action);
            l.remove(QRegExp("^ext"));

            QStringList msl(l.split(";;",QString::KeepEmptyParts));
            ui->txtQuot->clear();

            for(int x=0;x<msl.count();x++)
            {
                QStringList sl(msl[x].split(";",QString::KeepEmptyParts));

                if(sl.count()==5)
                {
                    QString apps("<a href=\""+sl[1]+";"+sl[2]+";"+sl[3]+"\">"+sl[0]+" "+sl[2]+"/"+sl[3]+"</a><br>"+CTranslit::tr(sl[4],CTranslit::CopticTrToCopticN)+"<br>");
                    ui->txtQuot->append(apps);
                }
                else
                    QMessageBox(QMessageBox::Critical,"quotation","invalid link",QMessageBox::Close,this);
            }

            if(!ui->wdgQuot->isVisible())
                ui->wdgQuot->show();
            ui->txtQuot->moveCursor(QTextCursor::Start);
        }
}

void CWordPreview::showfull(QString key)
{
	beforequery();

        QString query("select `word`,`type`,`crum`,`quality`,`cz`,`en`,`gr`,`added`,`updated`,`created_by`,`updated_by` from `coptwrd` where `key`="+key);
        CMySql q(query);

        messages->MsgMsg(tr("executing query '")+query+"' ...");
	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}
	if(!q.first())
	{
                messages->MsgErr(tr("something wrong"));
		return;
	}

        _store.init_line=QString("<a name=\"#word\"></a>WORD");

        CWordTemplate wt(messages->settings().isCopticEditable(),ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());

        QString wtp=q.value(1);
	words.append(CWordItem(key.toInt(),-1,0,
        q.value(0),"#w0",CWordItem::Word,wtp.toUShort()));

	wt.setKey(key.toInt());
	wt.setWordKey(key);
        wt.setType(wtp.toInt());
        wt.setCrum(q.value(2),"w1");
        wt.setQuality(q.value(3).toInt());
        wt.setWord(CCrumResultTree::trBrackets(words.last().word()));
        wt.setCzech(CCrumResultTree::format(q.value(4),ui->cbGrEqv->isChecked()));
        wt.setEnglish(CCrumResultTree::format(q.value(5),ui->cbGrEqv->isChecked()));
        wt.setGreek(q.value(6));
	wt.setTable("w");

        wt.setCreatedAt(q.value(7));
        wt.setUpdatedAt(q.value(8));
        wt.setCreatedBy(q.value(9));
        wt.setUpdatedBy(q.value(10));

        QString w_item;
        if(messages->settings().isCopticEditable())
            w_item=QString("<a name=\"#w0\">word - key: "+key+"</a>");
        else
            w_item=QString("<a name=\"#w0\">word</a>");

        QString query2("select `key`,`word`,`type`,`crum`,`cz`,`en`,`gr`,`added`,`updated`,`created_by`,`updated_by`,`key_word`,`key_deriv` from `coptdrv` where `key_word`="+key+" order by `pos`");
        CMySql q2(query2);

        messages->MsgMsg(tr("executing query '")+query2+"' ...");
        if(!q2.exec())
	{
                messages->MsgErr(q2.lastError());
		return;
	}

        int size=q2.size();
        wt.setDerivCount(QString::number(size));
        _store.appendItemW(w_item,wt);


        _store.init_line_d=QString("<a name=\"#deriv\"></a>records: "+QString::number(size));
        if(messages->settings().isCopticEditable())
            _store.init_line_d.append("<a href=\"cord"+key+"\">CHANGE ORDER/DELETE</a>");

	int pos=0;
	while(pos++,q2.next())
	{
            QString const strpos(QString::number(pos));
            QString k(q2.value(0)),
                kw(q2.value(11)),
                kd(q2.value(12));

            QString wtp(q2.value(2));
            derivs.append(CWordItem(k.toInt(),key.toInt(),pos,
                q2.value(1),"#d"+strpos,
                CWordItem::Derivation,wtp.toUShort()));


                CWordTemplate wt2(messages->settings().isCopticEditable(),ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());


                wt2.setKey(k.toInt());
		wt2.setWordKey(key);
                wt2.setType(wtp.toInt());
                wt2.setCrum(q2.value(3),"d"+strpos);
                wt2.setWord(CCrumResultTree::trBrackets(derivs.last().word()));
                wt2.setCzech(CCrumResultTree::format(q2.value(4),ui->cbGrEqv->isChecked()));
                wt2.setEnglish(CCrumResultTree::format(q2.value(5),ui->cbGrEqv->isChecked()));
                wt2.setGreek(q2.value(6));
		wt2.setNoQuality();
                wt2.setNoDerivCount();
		wt2.setTable("d");

                wt2.setCreatedAt(q2.value(7));
                wt2.setUpdatedAt(q2.value(8));
                wt2.setCreatedBy(q2.value(9));
                wt2.setUpdatedBy(q2.value(10));


                QString d_item;
                if(messages->settings().isCopticEditable())
                    d_item=QString("<a name=\""+derivs.last().anchor()+"\">"+strpos+
                "/"+QString::number(size)+" key: "+k+" key_word: "+kw+" key_deriv: "+kd+"</a>");
                else
                    d_item=QString("<a name=\""+derivs.last().anchor()+"\">"+strpos+
                "/"+QString::number(size)+"</a>");
                _store.appendItemD(d_item,wt2);
	}

	afterquery();
        displayStore();
	messages->MsgOk();
}
void CWordPreview::reorder(QString key)
{
	QString query("select `key`,`word`,`pos` from coptdrv where `key_word`="+key+" order by `pos`");
        CMySql q(query);

        messages->MsgMsg(tr("executing query '")+query+"' ...");
	if(!q.exec())
	{
                messages->MsgErr(q.lastError());
		return;
	}
	messages->MsgOk();

	QString query3("select `word` from coptwrd where `key`="+key);
        CMySql q3(query3);

	if(!q3.exec())
	{
                messages->MsgErr(q3.lastError());
		return;
	}
	if(!q3.first())
	{
                messages->MsgErr(tr("something wrong"));
		return;
	}
        CReorder r("reorder/delete",q.size(),q3.value(0));

	QFont cf(messages->settings().copticFont());
	cf.setPointSize(messages->settings().copticFontSize());

    r.setFont(cf);

	while(q.next())
	{
		r.appendItem(
                CTranslit::to(q.value(1),
			CTranslit::Copt),
                q.value(0),
                q.value(2)
		);
	}
	if(r.exec()==QDialog::Accepted)
	{
		if(!r.deleteAll())
		{
			if(r.Delete.size()>0)
			{
                            QMessageBox dlg(QMessageBox::Question,tr("delete derivations"),
                                tr("Deleting ")+QString::number(r.Delete.size())+tr(" items."),QMessageBox::Close|QMessageBox::Ok);

                                if(dlg.exec()==QMessageBox::Ok)
					for(int x=0;x<r.Delete.size();x++)
					{
                                                QString query("delete from `coptdrv` where `key`="+r.Delete.at(x));
                                                CMySql q(query);
                                                messages->MsgMsg(tr("deleting derivation by query ")+query+" ...");
						if(!q.exec())
						{
                                                        messages->MsgErr(q.lastError());
							return;
						}
					}
			}
			if(r.Reorder.size()>0)
				for(int x=0;x<r.Reorder.size();x++)
				{
                                        QString query("update `coptdrv` set `pos`="+QString::number(x+1)+" where `key`="+r.Reorder.at(x));
                                        CMySql q(query);
                                        messages->MsgMsg(tr("executing query '")+query+"' ...");
					if(!q.exec())
					{
                                                messages->MsgErr(q.lastError());
						return;
					}
				}
		}
		else
		{
                    QMessageBox dlg(QMessageBox::Question,tr("delete entire word"),tr("Deleting entire word with all derivations ..."),QMessageBox::Close|QMessageBox::Ok);

                        if(dlg.exec()==QMessageBox::Ok)
			{
                                QString query("delete from `coptdrv` where `key_word`="+key);
                                CMySql q(query);

                                messages->MsgMsg(tr("executing query '")+query+"' ...");
				if(!q.exec())
				{
                                        messages->MsgErr(q.lastError());
					return;
				}

                                QString query2("delete from `coptwrd` where `key`="+key);
                                CMySql q2(query2);

                                messages->MsgMsg(tr("executing query '")+query2+"' ...");
				if(!q2.exec())
				{
                                        messages->MsgErr(q2.lastError());
					return;
				}
			}
		}
	}

	messages->MsgOk();
}

void CWordPreview::on_btWord_clicked()
{
        ui->brPreview->browser()->scrollToAnchor("#word");
}

void CWordPreview::on_btDeriv_clicked()
{
        ui->brPreview->browser()->scrollToAnchor("#deriv");
}
void CWordPreview::afterquery()
{
    QRegExp re("<.+>");
    re.setMinimal(true);

    for(int x=0;x<words.size();x++)
    {
        CWordItem const & wi=words.at(x);
        ui->cmbW->addItem(wi.wtype()==99?QString("header"):CWordTemplate::formatw(CTranslit::to(CCrumResultTree::trBrackets(wi.word()),
            CTranslit::Copt),false).remove(re));
    }

    for(int x=0;x<derivs.size();x++)
    {
        CWordItem const & wi=derivs.at(x);
        ui->cmbD->addItem(wi.wtype()==99?QString("header"):CWordTemplate::formatw(CTranslit::to(CCrumResultTree::trBrackets(wi.word()),
            CTranslit::Copt),false).remove(re));
    }

    bool b_w(words.size()>0),b_d(derivs.size()>0);
    ui->btGoToW->setEnabled(b_w);
    ui->btTreeW->setEnabled(b_w);
    ui->btGoToD->setEnabled(b_d);
    ui->btTreeD->setEnabled(b_d);

    on_cmbD_activated(-1);
    on_cmbW_activated(-1);
    on_btWord_clicked();
}
void CWordPreview::clearTree()
{
    disconnect(ui->treeResult,SIGNAL(currentItemChanged(QTreeWidgetItem*,QTreeWidgetItem*)),this,SLOT(on_treeResult_currentItemChanged(QTreeWidgetItem* , QTreeWidgetItem* )));
    ui->treeResult->clear();
    ui->tbrOne->clear();
    ui->tbrTwo->clear();
    ui->cmbChilds->clear();
    _store_tbr.clear();
    _store_tbr2.clear();
    connect(ui->treeResult,SIGNAL(currentItemChanged(QTreeWidgetItem*,QTreeWidgetItem*)),this,SLOT(on_treeResult_currentItemChanged(QTreeWidgetItem* , QTreeWidgetItem* )));
}

void CWordPreview::beforequery()
{
    _store.clear();
    clearTree();
    ui->cmbW->clear();
    ui->cmbD->clear();
    ui->lblW->setText("0/0");
    ui->lblD->setText("0/0");
    words.clear();
    derivs.clear();
    ui->tbPreview->setCurrentIndex(0);
}

void CWordPreview::on_btWPrev_clicked()
{
    int ci(ui->cmbW->currentIndex()-1);
    if(ci>=0)
    {
        ui->cmbW->setCurrentIndex(ci);
        on_cmbW_activated(ci);
    }
}

void CWordPreview::on_btWNext_clicked()
{
    int ci(ui->cmbW->currentIndex()+1);
    if(ci<ui->cmbW->count())
    {
        ui->cmbW->setCurrentIndex(ci);
        on_cmbW_activated(ci);
    }
}

void CWordPreview::on_btDPrev_clicked()
{
    int ci(ui->cmbD->currentIndex()-1);
    if(ci>=0)
    {
        ui->cmbD->setCurrentIndex(ci);
        on_cmbD_activated(ci);
    }
}

void CWordPreview::on_btDNext_clicked()
{
    int ci(ui->cmbD->currentIndex()+1);
    if(ci<ui->cmbD->count())
    {
        ui->cmbD->setCurrentIndex(ci);
        on_cmbD_activated(ci);
    }
}

void CWordPreview::on_btGoToW_clicked()
{
    on_cmbW_activated(ui->cmbW->currentIndex());
}

void CWordPreview::on_btGoToD_clicked()
{
    on_cmbD_activated(ui->cmbD->currentIndex());
}

void CWordPreview::on_cmbW_activated(int )
{
    int index(ui->cmbW->currentIndex());
    if(index>=0)
    {
        ui->btWPrev->setEnabled(index!=0);
        ui->btWNext->setEnabled(index!=ui->cmbW->count()-1);

        CWordItem const * it=&words.at(index);
        ui->brPreview->browser()->scrollToAnchor(it->anchor());
        ui->lblW->setText(QString::number(it->pos())+"/"+
        QString::number(words.size()));
    }
    else
    {
        ui->btWNext->setEnabled(false);
        ui->btWPrev->setEnabled(false);
    }
}

void CWordPreview::on_cmbD_activated(int )
{
    int index(ui->cmbD->currentIndex());
    if(index>=0)
    {
        ui->btDPrev->setEnabled(index!=0);
        ui->btDNext->setEnabled(index!=ui->cmbD->count()-1);

        CWordItem const * it=&derivs.at(index);
        ui->brPreview->browser()->scrollToAnchor(it->anchor());
        ui->lblD->setText(QString::number(it->pos())+"/"+
        QString::number(derivs.size()));
    }
    else
    {
        ui->btDNext->setEnabled(false);
        ui->btDPrev->setEnabled(false);
    }
}

void CWordPreview::queryId(short table,int id)
{
    switch(table)
    {
    case 1 :
        query(QString("`coptwrd`.`key`="+QString::number(id)),1);
        break;
    case 2 :
        query(QString("`coptdrv`.`key`="+QString::number(id)),2);
        break;
    }
}

void CWordPreview::query(QString const & where,short table)
{
    USE_CLEAN_WAIT

	beforequery();

        int reccount(0),size(0),pos(0);
        if(table!=2)
        {
            QString query;

            if(ui->rbDirect->isChecked())
                query=("select *,(select count(*) from `coptdrv` where `key_word`=`q1`.`key`) as `q2` from (select `key`,`word`,`type`,`crum`,`quality`,`cz`,`en`,`gr`,`added`,`updated`,`created_by`,`updated_by` from `coptwrd` where "+where+" order by `crum` limit "+QString::number((ui->spnPage->value()-1)*ui->spnLimit->value())+","+QString::number(ui->spnLimit->value())+") as `q1`");
            else
                query="select *,(select count(*) from `coptdrv` where `key_word`=`q1`.`key`) as `q2` from (select distinct `coptwrd`.`key`,`coptwrd`.`word`,`coptwrd`.`type`,`coptwrd`.`crum`,`coptwrd`.`quality`,`coptwrd`.`cz`,`coptwrd`.`en`,`coptwrd`.`gr`,`coptwrd`.`added`,`coptwrd`.`updated`,`coptwrd`.`created_by`,`coptwrd`.`updated_by` from `crum_index` left join `coptwrd` on `crum_index`.`key`=`coptwrd`.`key` where `wd`=1 and "+where+" order by `coptwrd`.`crum` limit "+QString::number((ui->spnPage->value()-1)*ui->spnLimit->value())+","+QString::number(ui->spnLimit->value())+") as `q1`";

            MQUERY(q,query)

            //int reccount,size;
            _store.init_line=QString(QString(tr("<a name=\"#word\"></a><p>words:\t"))+	QString::number(size=reccount=q.size())+"/"+QString::number(ui->spnLimit->value())+tr(" page: ")+QString::number(ui->spnPage->value())+"</p>");


            while(pos++,q.next())
            {
                QString const strpos(QString::number(pos));

                    CWordTemplate wt(messages->settings().isCopticEditable(),ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());

                    int key=q.value(0).toInt();

                    //QString qdercount("select count(*) from `coptdrv` where `key_word`="+QString::number(key));
                    //MQUERY_GETFIRST(qdc,qdercount)

                    QString wtp(q.value(2));

                    wt.setKey(key);
                    words.append(CWordItem(key,-1,pos,q.value(1),
                    "#w"+strpos,
                    CWordItem::Word,wtp.toUShort()));

                    wt.setWordKey(QString::number(key));
                    wt.setType(wtp.toInt());
                    wt.setCrum(q.value(3),"w"+strpos);
                    wt.setQuality(q.value(4).toInt());
                    wt.setWord(CCrumResultTree::trBrackets(words.last().word()));
                    wt.setCzech(CCrumResultTree::format(q.value(5),ui->cbGrEqv->isChecked()));
                    wt.setEnglish(CCrumResultTree::format(q.value(6),ui->cbGrEqv->isChecked()));
                    wt.setGreek(q.value(7));
                    wt.setTable("w");

                    wt.setCreatedAt(q.value(8));
                    wt.setUpdatedAt(q.value(9));
                    wt.setCreatedBy(q.value(10));
                    wt.setUpdatedBy(q.value(11));

                    wt.setDerivCount(q.value(12));

                    QString w_item;
                    if(messages->settings().isCopticEditable())
                        w_item=QString("<a name=\""+words.last().anchor()+"\">"+strpos+
                                          "/"+QString::number(size)+" key: "+QString::number(key)+"</a>");
                    else
                        w_item=QString("<a name=\""+words.last().anchor()+"\">"+strpos+
                                          "/"+QString::number(size)+"</a>");

                    _store.appendItemW(w_item,wt);
            }
        }

        if(ui->cbDeriv->isChecked()&&table!=1)
        {
            QString query2;
            if(ui->rbDirect->isChecked())
                query2="select `key`,`key_word`,`word`,`type`,`crum`,`cz`,`en`,`gr`,`added`,`updated`,`created_by`,`updated_by`,`key_deriv` from `coptdrv` where "+where+" order by `crum` limit "+QString::number((ui->spnPage->value()-1)*ui->spnLimit->value())+","+QString::number(ui->spnLimit->value());
            else
                query2="select distinct `coptdrv`.`key`,`coptdrv`.`key_word`,`coptdrv`.`word`,`coptdrv`.`type`,`coptdrv`.`crum`,`coptdrv`.`cz`,`coptdrv`.`en`,`coptdrv`.`gr`,`coptdrv`.`added`,`coptdrv`.`updated`,`coptdrv`.`created_by`,`coptdrv`.`updated_by`,`coptdrv`.`key_deriv` from `crum_index` left join `coptdrv` on `crum_index`.`key`=`coptdrv`.`key` where `wd`=2 and "+where+" order by `coptdrv`.`crum` limit "+QString::number((ui->spnPage->value()-1)*ui->spnLimit->value())+","+QString::number(ui->spnLimit->value());

                MQUERY(q2,query2)

                reccount+=q2.size();

                _store.init_line_d=QString(QString(tr("<a name=\"#deriv\"></a><p>derivations:\t"))+	QString::number(size=q2.size())+"/"+QString::number(ui->spnLimit->value())+tr(" page: ")+QString::number(ui->spnPage->value())+"</p>");

                pos=0;
                while(pos++,q2.next())
                {
                    QString const strpos(QString::number(pos));

                        CWordTemplate wt2(messages->settings().isCopticEditable(),ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());
                        QString k(q2.value(0)),
                            kw(q2.value(1)),
                            kd(q2.value(12));

                        QString wtp(q2.value(3));

                        derivs.append(CWordItem(
                        k.toInt(),
                        kw.toInt(),
                        pos,
                        q2.value(2),
                        "#d"+strpos,
                        CWordItem::Word,wtp.toUShort()));

                        wt2.setKey(derivs.last().key());
                        wt2.setWordKey(QString::number(
                        derivs.last().key_word()));
                        wt2.setType(wtp.toInt());
                        wt2.setCrum(q2.value(4),"d"+strpos);
                        wt2.setWord(CCrumResultTree::trBrackets(derivs.last().word()));
                        wt2.setCzech(CCrumResultTree::format(q2.value(5),ui->cbGrEqv->isChecked()));
                        wt2.setEnglish(CCrumResultTree::format(q2.value(6),ui->cbGrEqv->isChecked()));
                        wt2.setGreek(q2.value(7));
                        wt2.setNoQuality();
                        wt2.setNoDerivCount();
                        wt2.setTable("d");

                        wt2.setCreatedAt(q2.value(8));
                        wt2.setUpdatedAt(q2.value(9));
                        wt2.setCreatedBy(q2.value(10));
                        wt2.setUpdatedBy(q2.value(11));

                        QString d_item;
                        if(messages->settings().isCopticEditable())
                        d_item=QString("<a name=\""+derivs.last().anchor()+"\">"+strpos+
                                          "/"+QString::number(size)+" key: "+k+" key_word: "+kw+" key_deriv: "+kd+"</a>");
                        else
                            d_item=QString("<a name=\""+derivs.last().anchor()+"\">"+strpos+
            "/"+QString::number(size)+"</a>");
                        _store.appendItemD(d_item,wt2);

                }
		}
        _store.last_line=QString(QString(tr("<p>total:\t"))+	QString::number(reccount)+"</p>");

	afterquery();

        displayStore();

        switch(table)
        {
        case 1 :
            on_btTreeW_clicked();
            break;
        case 2 :
            on_btTreeD_clicked();
            break;
        }

	messages->MsgOk();
}
void CWordPreview::on_txtCzEn_returnPressed()
{
	on_btQuery_clicked();
}
void CWordPreview::queryCoptic(QString const & word)
{
    showPage(Search);
    ui->tabQuery->setCurrentIndex(0);
    ui->inpWord->setText(word);
    on_btQuery_clicked();
}

void CWordPreview::on_btPrev_clicked()
{
        ui->cmbCrum->setCurrentIndex(ui->cmbCrum->currentIndex()-1);
}

void CWordPreview::on_btNext_clicked()
{
        ui->cmbCrum->setCurrentIndex(ui->cmbCrum->currentIndex()+1);
}

void CWordPreview::on_cmbCrum_activated(int )
{
	on_btQuery_clicked();
}
void CWordPreview::checkalld(bool ch)
{
        ui->cbS->setChecked(ch);
        ui->cbSa->setChecked(ch);
        ui->cbSf->setChecked(ch);
        ui->cbAch->setChecked(ch);
        ui->cbsA->setChecked(ch);
        ui->cbBoh->setChecked(ch);
        ui->cbF->setChecked(ch);
        ui->cbFb->setChecked(ch);
        ui->cbO->setChecked(ch);
        ui->cbNH->setChecked(ch);
}
void CWordPreview::on_btCheckAll_clicked()
{
	checkalld(true);
}

void CWordPreview::on_btUncheckAll_clicked()
{
	checkalld(false);
}

void CWordPreview::on_btFullW_clicked()
{
    if(ui->cmbW->currentIndex()!=-1)
        showfull(QString::number(words[ui->cmbW->currentIndex()].key()));
}

void CWordPreview::on_btFullD_clicked()
{
    if(ui->cmbD->currentIndex()!=-1)
        showfull(QString::number(derivs[ui->cmbD->currentIndex()].key_word()));
}

void CWordPreview::on_inpWord_query()
{
    startQuery();
}

void CWordPreview::on_trGreek_query()
{
    on_btQuery_clicked();
}

void CWordPreview::on_tbPreview_currentChanged(int index)
{
    ui->stwView->setCurrentIndex(index);
}


void CWordPreview::on_btTreeW_clicked()
{
    int i=ui->cmbW->currentIndex();
    if(i!=-1)
    {
        USE_CLEAN_WAIT

        CWordItem const * wi=&words[i];
        ui->treeResult->showInTree(wi,CResultItem::Wrd,false);
        CResultItem * ri=ui->treeResult->itemByKey(wi->key(),CResultItem::Wrd);
        if(ri)
        {
            //treeResult->clearSelection();
            //ri->setSelected(true);
            //on_treeResult_currentItemChanged(ri,0);
            //treeResult->scrollToItem(ri);
            ui->tbPreview->setCurrentIndex(1);
            ui->treeResult->setFocus();
            ui->treeResult->scrollToItem(ri);
            ui->treeResult->setCurrentItem(ri);
        }
        for(int x=0;x<words.size();x++)
        {
            CResultItem * resi(ui->treeResult->itemByKey(words[x].key(),CResultItem::Wrd));
            if(resi)
                resi->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
        }
        for(int x=0;x<derivs.size();x++)
        {
            CResultItem * resi(ui->treeResult->itemByKey(derivs[x].key(),CResultItem::Drv));
            if(resi)
                resi->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
        }
    }
}

void CWordPreview::on_btTreeD_clicked()
{
    int i=ui->cmbD->currentIndex();
    if(i!=-1)
    {
        USE_CLEAN_WAIT

        CWordItem const * wi=&derivs[i];
        ui->treeResult->showInTree(wi,CResultItem::Drv,false);
        CResultItem * ri=ui->treeResult->itemByKey(wi->key(),CResultItem::Drv);
        if(ri)
        {
            /*treeResult->clearSelection();
            ri->setSelected(true);
            on_treeResult_currentItemChanged(ri,0);
            treeResult->scrollToItem(ri);*/
            ui->tbPreview->setCurrentIndex(1);
            ui->treeResult->setFocus();
            ui->treeResult->scrollToItem(ri);
            ui->treeResult->setCurrentItem(ri);
        }
        for(int x=0;x<words.size();x++)
        {
            CResultItem * resi(ui->treeResult->itemByKey(words[x].key(),CResultItem::Wrd));
            if(resi)
                resi->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
        }
        for(int x=0;x<derivs.size();x++)
        {
            CResultItem * resi(ui->treeResult->itemByKey(derivs[x].key(),CResultItem::Drv));
            if(resi)
                resi->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
        }
    }

}

void CWordPreview::on_treeResult_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    if(current)
    {
        ui->treeResult->hideToolTip();
        ui->treeResult->clearSelection();
        current->setSelected(true);
    }
    else
        return;

    CResultItem * ri((CResultItem *)current);

    _store_tbr.clear();
    _store_tbr2.clear();
    ui->cmbChilds->clear();

    CWordTemplate wt(false,ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());

    wt.setKey(ri->key);
    wt.setWordKey(QString::number(ri->word_key));
    wt.setType(ri->wtype);
    wt.setCrum(ri->crum,QString());
    wt.setQuality(ri->quality);
    wt.setWord(CCrumResultTree::trBrackets(ri->word));
    wt.setCzech(CCrumResultTree::format(ri->cz,ui->cbGrEqv->isChecked()));
    //wt.setEnglish(CCrumResultTree::format(ri->en,ui->cbGrEqv->isChecked()));
    wt.setGreek(QString());
    //wt.setTable("w");

    wt.setCreatedAt(QString());
    wt.setUpdatedAt(QString());
    wt.setCreatedBy(QString());
    wt.setUpdatedBy(QString());

    unsigned int ch;
    wt.setDerivCount(QString::number(ch=ri->childCount()));

    if(ri->wtype==99)
    {
        wt.setEnglish(CCrumResultTree::convertHeaderText(ri->en));
        wt.setTable("w");
        wt.setNoQuality();
        _store_tbr._mode=CWordTemplate::Header;
        _store_tbr._wt=wt;
    }
    else
    {
        wt.setEnglish(CCrumResultTree::format(ri->en,ui->cbGrEqv->isChecked()));
        switch(ri->type)
        {
        case CResultItem::Wrd :
            {
                wt.setTable("w");
                _store_tbr._mode=CWordTemplate::EditWord;
                _store_tbr._wt=wt;
                break;
            }
        case CResultItem::Drv :
            {
                wt.setTable("d");
                wt.setNoQuality();
                _store_tbr._mode=CWordTemplate::EditWord;
                _store_tbr._wt=wt;
                break;
            }
        }
    }

    QString tx,tch(QString::number(ch));
    for(unsigned int x=0;x<ch;x++)
    {
        CResultItem * ric=(CResultItem *)ri->child(x);

        CWordTemplate wt2(false,ui->cbCzech->isChecked(),messages->settings().border(),messages->settings().padding(),messages->settings().spacing());

        wt2.setKey(ric->key);
        wt2.setWordKey(QString::number(ric->word_key));
        wt2.setType(ric->wtype);
        wt2.setCrum(ric->crum,QString());
        wt2.setNoQuality();
        wt2.setWord(CCrumResultTree::trBrackets(ric->word));
        wt2.setCzech(CCrumResultTree::format(ric->cz,ui->cbGrEqv->isChecked()));
        wt2.setEnglish(CCrumResultTree::format(ric->en,ui->cbGrEqv->isChecked()));
        wt2.setGreek(QString());
        wt2.setTable("d");

        wt2.setCreatedAt(QString());
        wt2.setUpdatedAt(QString());
        wt2.setCreatedBy(QString());
        wt2.setUpdatedBy(QString());

        unsigned int ch;
        wt2.setDerivCount(QString::number(ch=ric->childCount()));

        wt2.setTable("d");
        wt2.setNoQuality();

        QRegExp re("<.*>");
        re.setMinimal(true);

        //cmbChilds->addItem(ric->formatted_word.remove(re));

        tx=QString::number(x+1);
        QString tbr2_line("<a name=\""+tx+"\">"+tx+"/"+tch+"</a>");
        if(ric->wtype==99)
        {
            ui->cmbChilds->addItem(ric->en);
            _store_tbr2.appendItem(wt2,CWordTemplate::Header,tbr2_line);
        }
        else
        {
            ui->cmbChilds->addItem(ric->formatted_word.remove(re));
            _store_tbr2.appendItem(wt2,CWordTemplate::EditWord,tbr2_line);
        }
    }

    displayStoreTbr();
    displayStoreTbr2();

}

void CWordPreview::on_treeResult_customContextMenuRequested(QPoint )
{
    CResultItem * ri((CResultItem *)ui->treeResult->currentItem());
    resolve->setEnabled(ri);
    a_cpregexp->setEnabled(ri);
    a_srchregexp->setEnabled(ri);

    QAction * a;
    if((a=popup.exec()))
    {
        if(a==clr)
        {
            clearTree();
        }
        else if(a==show_panel)
        {
            ui->wdgTopPanel->setVisible(show_panel->isChecked());
        }
        else if(a==resolve)
        {
            resolveLine(ri);
        }
        else if(a==a_cpregexp)
            copyAsRegexp(ri);
        else if(a==a_srchregexp)
        {
            messages->libSearchWidget().searchCoptic(copyAsRegexp(ri));
            //emit searchInLibrary(copyAsRegexp());
            //tbrOne->browser()->append("\n(under development, paste text from clipboard into proper field manually)");
            //tbrOne->browser()->moveCursor(QTextCursor::End);
        }
        else if(a==a_exp)
            ui->treeResult->expandAll();
        else if(a==a_coll)
            ui->treeResult->collapseAll();
        else if(a==a_labels)
            ui->treeResult->setShowToolTips(a_labels->isChecked());
    }
}

/*void CWordPreview::on_treeResult_headerAdded(CResultItem* item)
{

}*/

void CWordPreview::slot_tbrOne_anchorClicked(QUrl url)
{
    QString action=url.toString();
    if(action.contains(QRegExp("^(crum|ext)")))
        slot_brPreview_anchorClicked(url);
}

void CWordPreview::slot_tbrTwo_anchorClicked(QUrl url)
{
    QString action=url.toString();
    if(action.contains(QRegExp("^(crum|ext)")))
        slot_brPreview_anchorClicked(url);
}

void CWordPreview::on_cmbChilds_currentIndexChanged(int index)
{
    ui->tbrTwo->browser()->scrollToAnchor(QString::number(index+1));
}

void CWordPreview::on_btShow_clicked()
{
    int x=ui->cmbChilds->currentIndex();
    if(x!=-1)
        on_cmbChilds_currentIndexChanged(x);
}

void CWordPreview::on_btUp_clicked()
{
    int x=ui->cmbChilds->currentIndex();
    if(x>0)
    {
        ui->cmbChilds->setCurrentIndex(x-1);
        //on_cmbChilds_currentIndexChanged(x);
    }
}

void CWordPreview::on_btBottom_clicked()
{
    int y=ui->cmbChilds->count();
    if(y>0)
    {
        ui->cmbChilds->setCurrentIndex(y-1);
        //on_cmbChilds_currentIndexChanged(x);
    }
}

void CWordPreview::on_btDown_clicked()
{
    int x=ui->cmbChilds->currentIndex(),
        y=ui->cmbChilds->count();
    if(x!=-1&&y-1!=x)
    {
        ui->cmbChilds->setCurrentIndex(x+1);
        //on_cmbChilds_currentIndexChanged(x);
    }
}

void CWordPreview::on_btTop_clicked()
{
    int y=ui->cmbChilds->count();
    if(y!=0)
    {
        ui->cmbChilds->setCurrentIndex(0);
        //on_cmbChilds_currentIndexChanged(x);
    }
}

void CWordPreview::on_btAllInTree_clicked()
{
    USE_CLEAN_WAIT

    clearTree();
    for(int x=0;x<words.size();x++)
    {
        CWordItem const * wi=&words[x];
        ui->treeResult->showInTree(wi,CResultItem::Wrd,false);
        CResultItem * ri=ui->treeResult->itemByKey(wi->key(),CResultItem::Wrd);
        ri->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
    }
    for(int x=0;x<derivs.size();x++)
    {
        CWordItem const * wi=&derivs[x];
        ui->treeResult->showInTree(wi,CResultItem::Drv,false);
        CResultItem * ri=ui->treeResult->itemByKey(wi->key(),CResultItem::Drv);
        ri->setIcon(0,QIcon(":/new/icons/icons/greencheck.png"));
    }
    ui->tbPreview->setCurrentIndex(1);
}

QString CWordPreview::copyAsRegexp(CResultItem * ri) const
{
    if(ri)
    {
        QString cs("(");
        ri->resolveItem();
        int const d=dialects();
        for(int x=0;x<ri->cwitem.wlist_resolved.count();x++)
        {
            if(d&ri->cwitem.wlist_resolved[x].first)
                cs.append(QString(ri->cwitem.wlist_resolved[x].second).remove(QRegExp("[=-+]"))+"|");
        }
        if(cs.count()>1)
        {
            cs.chop(1);
            cs.append(")");
        }
        else
            cs="(none)";

        QApplication::clipboard()->setText(cs);

        QString msg(tr("<br><br>regular expression<br>")+cs+tr("<br>copied into clipboard<br>used dialects: ")+dialectsAsStr());
        messages->MsgMsg(windowTitle()+": "+msg);
        ui->tbrOne->browser()->append(msg);
        ui->tbrOne->browser()->moveCursor(QTextCursor::End);

        return cs;
    }
    return QString();
}

void CWordPreview::resolveLine(CResultItem * ri)
{
    if(ri&&_store_tbr.c_lines.isEmpty())
    {
        ri->resolveItem();
        for(int x=0;x<ri->cwitem.wlist.count();x++)
        {
            _store_tbr.c_lines.append(ri->cwitem.dAsStr(x)+" "+CWordTemplate::formatw(CTranslit::tr(ri->cwitem.word(x),CTranslit::CopticDictC,false,CTranslit::RemoveNone),false));
        }
        //tbrOne->browser()->append("<br>resolved : <br>");
        for(int x=0;x<ri->cwitem.wlist_resolved.count();x++)
        {
            _store_tbr.combs.append(CWordTemplate::formatw(CWItem::dToStr(ri->cwitem.wlist_resolved[x].first)+" "+CTranslit::tr(ri->cwitem.wlist_resolved[x].second,CTranslit::CopticDictC,false,CTranslit::RemoveNone),false));
        }
        displayStoreTbr();
    }
}

void CWordPreview::printInfo()
{
    QString query("select (select count(`key`) from `coptwrd`) as `words`,(select count(`key`) from `coptdrv`) as `derivations`,(select count(*) from `crum_index`) as `index`");
    MQUERY_GETFIRST(q,query)

    unsigned int inum(q.value(2).toUInt());
    ui->brPreview->browser()->append(tr("words: ")+q.value(0)+tr("<br>derivations: ")+q.value(1)+"<br>index: "+QString::number(inum));
    if(inum==0)
    {
        ui->rbDirect->setChecked(true);
        //rbIndex->setEnabled(false);

        ui->brPreview->browser()->append(tr("<br>You have created no index yet. Use main application menu <b><i>database->(re)create index of coptic tables</i></b> and create it.<br>"));

    }
    else
        ui->rbIndex->setChecked(true);

    QDate lupd(latestUpdate());
    ui->brPreview->browser()->append(tr("<br>latest update: ")+(lupd.isValid()?lupd.toString("dd. MM. (MMMM) yyyy"):tr("unknown")));
    messages->MsgOk();
}

/*void CWordPreview::on_rbIndex_toggled(bool checked)
{
    if(checked)
    {
        cbDeriv->setChecked(true);
        cbDeriv->setEnabled(false);
    }
}

void CWordPreview::on_rbDirect_toggled(bool checked)
{
    if(checked)
    {
        //cbDeriv->setChecked(true);
        cbDeriv->setEnabled(true);
    }
}*/

void CWordPreview::settings_fontChanged(CTranslit::Script uf, QFont f)
{
    QString s;
    switch(uf)
    {
        case CTranslit::Copt :
        {
            ui->inpWord->refreshFonts();
            ui->cmbW->setFont(f);
            ui->cmbD->setFont(f);
            ui->cmbChilds->setFont(f);
            ui->brPreview->setFont(f);
            ui->tbrOne->setFont(f);
            ui->tbrTwo->setFont(f);
            ui->treeResult->setFont(f);
            ui->txtQuot->setFont(f);
            ui->treeResult->setToolTipFont(f);

            s=tr("Coptic");
            break;
        }
        case CTranslit::Latin :
        {
            ui->inpWord->refreshFonts();
            ui->trGreek->refreshFonts();
            ui->txtCzEn->setFont(f);

            s=tr("Latin");
            break;
        }
        case CTranslit::Greek :
        {
            ui->trGreek->refreshFonts();

            s=tr("Greek");
            break;
        }
        case CTranslit::Hebrew :
        {
            s=tr("Hebrew");
            break;
        }
    }
    messages->MsgMsg(windowTitle()+": "+s+tr(" font changed"));
}

void CWordPreview::on_brPreview_dictionaryRequested(int dict,QString const & word)
{
    showDictionary(dict,word);
}

void CWordPreview::on_tbrOne_dictionaryRequested(int dict,QString const & word)
{
    showDictionary(dict,word);
}

void CWordPreview::on_tbrTwo_dictionaryRequested(int dict,QString const & word)
{
    showDictionary(dict,word);
}

void CWordPreview::showDictionary(int dict,QString const & word)
{
    switch(dict)
    {
    case CBookTextBrowser::Crum :
        ui->inpWord->setText(word);
        ui->inpWord->setSwitchState(false);
        ui->rbExact->setChecked(true);
        break;
    case CBookTextBrowser::LSJ :
    {
        bool const is_gk(CTranslit::isGreek(word));
        QString w;
        if(is_gk)
            w=CTranslit::tr(word,CTranslit::GreekNToGreekTr,true,CTranslit::RemoveAll);
        else
            w=CTranslit::tr(word,CTranslit::LatinNToLatinTr,true,CTranslit::RemoveAll);
        gkdict()->prepareParse(w,is_gk);
        _gkdict->parse(is_gk);
        showPage(DictGk);
        break;
    }
    }
}

void CWordPreview::displayStore()
{
    ui->brPreview->browser()->clear();

    /*QRegExp r("<.*>");
    r.setMinimal(true);*/

    QString atxt(_store.init_line);


    for(int x=0;x<_store.count;x++)
    {
        CWordTemplate lwt(_store._wt[x]);

        QString cw(lwt.wordTr()),ce(lwt.enTr()),cc(lwt.czTr());
        if(ui->brPreview->rmAccents())
        {
            cw.remove(QRegExp("[\\[\\]\\(\\)]"));
            //ce=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
            //cc=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
        }
        if(ui->brPreview->rmSpaces())
        {
            cw.remove(" ");
            ce.remove(" ");
            cc.remove(" ");
        }
        /*if(brPreview->isHighlightChecked())
        {
            cw=CTranslit::highlightHtmlText(itext,cw,fcolor,bcolor,breg,bwrds);
            ce=CTranslit::highlightHtmlText(itext,ce,fcolor,bcolor,breg,bwrds);
            cc=CTranslit::highlightHtmlText(itext,cc,fcolor,bcolor,breg,bwrds);
        }*/

        lwt.changeWord(cw);
        lwt.changeEn(ce);
        lwt.changeCz(cc);

        atxt.append(_store.h_line[x]);
        atxt.append(lwt.create(CWordTemplate::EditWord,true));
    }

    atxt.append(_store.init_line_d);
    for(int y=0;y<_store.count_d;y++)
    {
        CWordTemplate lwt(_store._wt_d[y]);

        QString cw(lwt.wordTr()),ce(lwt.enTr()),cc(lwt.czTr());
        if(ui->brPreview->rmAccents())
        {
            cw.remove(QRegExp("[\\[\\]\\(\\)]"));
            //ce=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
            //cc=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
        }
        if(ui->brPreview->rmSpaces())
        {
            cw.remove(" ");
            ce.remove(" ");
            cc.remove(" ");
        }
        /*if(brPreview->isHighlightChecked())
        {
            //cw.remove(r);

            cw=CTranslit::highlightHtmlText(itext,cw,fcolor,bcolor,breg,bwrds);
            ce=CTranslit::highlightHtmlText(itext,ce,fcolor,bcolor,breg,bwrds);
            cc=CTranslit::highlightHtmlText(itext,cc,fcolor,bcolor,breg,bwrds);

        }*/

        lwt.changeWord(cw);
        lwt.changeEn(ce);
        lwt.changeCz(cc);

        atxt.append(_store.h_line_d[y]);
        atxt.append(lwt.create(CWordTemplate::EditDeriv,true));
    }

    atxt.append(_store.last_line);

    ui->brPreview->browser()->insertHtml(atxt);
    ui->brPreview->finalizeContent();
    ui->brPreview->browser()->moveCursor(QTextCursor::Start);
}

void CWordPreview::displayStoreTbr()
{
    bool hl=ui->tbrOne->isHighlightChecked();

    ui->tbrOne->browser()->clear();

    CWordTemplate lwt(_store_tbr._wt);

    QString cw(lwt.wordTr()),ce(lwt.enTr()),cc(lwt.czTr());
    if(ui->tbrOne->rmAccents())
    {
        cw.remove(QRegExp("[\\[\\]\\(\\)]"));
        //ce=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
        //cc=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
    }
    if(ui->tbrOne->rmSpaces())
    {
        cw.remove(" ");
        ce.remove(" ");
        cc.remove(" ");
    }
    /*if(tbrOne->isHighlightChecked())
    {
        //cw.remove(r);

        cw=CTranslit::highlightHtmlText(itext,cw,fcolor,bcolor,breg,bwrds);
        ce=CTranslit::highlightHtmlText(itext,ce,fcolor,bcolor,breg,bwrds);
        cc=CTranslit::highlightHtmlText(itext,cc,fcolor,bcolor,breg,bwrds);

    }*/

    lwt.changeWord(cw);
    lwt.changeEn(ce);
    lwt.changeCz(cc);

    QString atxt(lwt.create(_store_tbr._mode,false));


    if(!_store_tbr.c_lines.isEmpty())
    {
        atxt.append(tr("<br>(this function is still under development)<br>"));
        for(int y=0;y<_store_tbr.c_lines.count();y++)
        {
            QString o_s(_store_tbr.c_lines[y]);
            /*if(tbrOne->isHighlightChecked())
                o_s=CTranslit::highlightHtmlText(itext,o_s,fcolor,bcolor,breg,bwrds);*/

            atxt.append(o_s+"<br>");
        }

        atxt.append(tr("<br>resolved:<br>"));

        for(int x=0;x<_store_tbr.combs.count();x++)
        {
            QString o_s(_store_tbr.combs[x]);
            if(ui->tbrOne->rmSpaces())
                o_s.remove(" ");
            /*if(tbrOne->isHighlightChecked())
                o_s=CTranslit::highlightHtmlText(itext,o_s,fcolor,bcolor,breg,bwrds);*/

            atxt.append(o_s+"<br>");
        }
    }

    ui->tbrOne->browser()->insertHtml(atxt);
    ui->tbrOne->finalizeContent();
    if(hl)
        ui->tbrOne->highlightText(true);
    else
        ui->tbrOne->browser()->moveCursor(QTextCursor::Start);
}

void CWordPreview::on_txtQuot_anchorClicked(QUrl url)
{
    QString s(url.toString());
    QStringList sl(s.split(";",QString::KeepEmptyParts));
    if(sl.count()==3)
        messages->libWidget().openMysqlBook(sl[0].toInt(),sl[1].toInt(),sl[2].toInt(),CTranslit::Copt);
        //emit copticBookRequested(sl[0].toInt(),sl[1].toInt(),sl[2].toInt());
}

void CWordPreview::displayStoreTbr2()
{
    bool hl=ui->tbrOne->isHighlightChecked();

    ui->tbrTwo->browser()->clear();

    QString atxt;

    for(int x=0;x<_store_tbr2.count;x++)
    {
        CWordTemplate lwt(_store_tbr2._wt[x]);
        QString cw(lwt.wordTr()),ce(lwt.enTr()),cc(lwt.czTr());
        if(ui->tbrTwo->rmAccents())
        {
            cw.remove(QRegExp("[\\[\\]\\(\\)]"));
            //ce=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
            //cc=CTranslit::tr(ce,CTranslit::LatinNToLatinTr,true,false);
        }
        if(ui->tbrTwo->rmSpaces())
        {
            cw.remove(" ");
            ce.remove(" ");
            cc.remove(" ");
        }
        /*if(tbrTwo->isHighlightChecked())
        {
            //cw.remove(r);

            cw=CTranslit::highlightHtmlText(itext,cw,fcolor,bcolor,breg,bwrds);
            ce=CTranslit::highlightHtmlText(itext,ce,fcolor,bcolor,breg,bwrds);
            cc=CTranslit::highlightHtmlText(itext,cc,fcolor,bcolor,breg,bwrds);

        }*/

        lwt.changeWord(cw);
        lwt.changeEn(ce);
        lwt.changeCz(cc);

        atxt.append(_store_tbr2._lines[x]);
        atxt.append(lwt.create(_store_tbr2._mode[x],false));
    }

    ui->tbrTwo->browser()->insertHtml(atxt);
    ui->tbrTwo->finalizeContent();
    if(hl)
        ui->tbrTwo->highlightText(true);
    else
        ui->tbrTwo->browser()->moveCursor(QTextCursor::Start);
}

void CWordPreview::on_brPreview_contentChanged(bool,bool,bool * processed)
{
    displayStore();
    *processed=true;
}

void CWordPreview::on_tbrOne_contentChanged(bool,bool,bool * processed)
{
    displayStoreTbr();
    *processed=true;
}

void CWordPreview::on_tbrTwo_contentChanged(bool,bool,bool * processed)
{
    displayStoreTbr2();
    *processed=true;
}

void CWordPreview::on_btHideQuot_clicked()
{
    if(ui->wdgQuot->isVisible())
        ui->wdgQuot->hide();
}

void CWordPreview::on_btInvert_clicked()
{
    ui->cbS->setChecked(!ui->cbS->isChecked());
    ui->cbSa->setChecked(!ui->cbSa->isChecked());
    ui->cbSf->setChecked(!ui->cbSf->isChecked());
    ui->cbAch->setChecked(!ui->cbAch->isChecked());
    ui->cbsA->setChecked(!ui->cbsA->isChecked());
    ui->cbBoh->setChecked(!ui->cbBoh->isChecked());
    ui->cbF->setChecked(!ui->cbF->isChecked());
    ui->cbFb->setChecked(!ui->cbFb->isChecked());
    ui->cbO->setChecked(!ui->cbO->isChecked());
    ui->cbNH->setChecked(!ui->cbNH->isChecked());
}

void CWordPreview::on_rbIdSearch_clicked()
{
    ui->fmCrumPg->setEnabled(false);
    ui->fmDate->setEnabled(false);
    ui->fmId->setEnabled(true);
}

void CWordPreview::on_rbDate_clicked()
{
    ui->fmCrumPg->setEnabled(false);
    ui->fmDate->setEnabled(true);
    ui->fmId->setEnabled(false);
}

void CWordPreview::on_rbCrumPg_clicked()
{
    ui->fmCrumPg->setEnabled(true);
    ui->fmDate->setEnabled(false);
    ui->fmId->setEnabled(false);
}

void CWordPreview::on_btAction2_clicked(bool checked)
{
    if(checked)
    {
        popup.setButton(ui->btAction2);
        on_treeResult_customContextMenuRequested(QPoint());
    }
}

void CWordPreview::on_btAutoHL_clicked(bool checked)
{
    ui->brPreview->highlightText(checked);
    ui->tbrOne->highlightText(checked);
    ui->tbrTwo->highlightText(checked);
}


QDate CWordPreview::latestUpdate()
{
    QString const query("select greatest((select max(`added`) from `coptwrd`),(select max(`updated`) from `coptwrd`),(select max(`added`) from `coptdrv`),(select max(`updated`) from `coptdrv`))");
    MQUERY_GETFIRST_RV(q,query,QDate())

    if(!q.isNULL(0))
            return QDate::fromString(q.value(0),"yyyy-MM-dd");
    else return QDate();
}

//

CWTStore::CWTStore()
    :init_line(),
    init_line_d(),
    last_line(),
    h_line(),h_line_d(),
    _wt(),_wt_d(),
    count(0),count_d(0)
{

}

void CWTStore::appendItemW(QString const & hline, CWordTemplate const & wt)
{
    h_line.append(hline);
    _wt.append(wt);
    count++;
}

void CWTStore::appendItemD(QString const & hline, CWordTemplate const & wt)
{
    h_line_d.append(hline);
    _wt_d.append(wt);
    count_d++;
}

void CWTStore::clear()
{
    init_line.clear();
    init_line_d.clear();
    last_line.clear();
    _wt.clear();
    _wt_d.clear();
    h_line.clear();
    h_line_d.clear();
    count=0;
    count_d=0;
}

//

CWTStoreTbr::CWTStoreTbr()
    :_wt(),_mode(CWordTemplate::EditWord),c_lines(),combs()
{

}

void CWTStoreTbr::clear()
{
    c_lines.clear();
    combs.clear();
}

//

CWTStoreTbr2::CWTStoreTbr2()
    :_wt(),_mode(),_lines(),count(0)
{

}

void CWTStoreTbr2::clear()
{
    _lines.clear();
    _mode.clear();
    _wt.clear();
    count=0;
}

void CWTStoreTbr2::appendItem(CWordTemplate const & wt,CWordTemplate::Mode mode, QString const & line)
{
    _wt.append(wt);
    _lines.append(line);
    _mode.append(mode);
    count++;
}
